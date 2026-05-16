data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_route53_zone" "main" {
  name         = "flightadmins.com"
  private_zone = false
}

# ACM certificate with DNS validation
resource "aws_acm_certificate" "flightdesk" {
  domain_name               = "flightadmins.com"
  subject_alternative_names = ["www.flightadmins.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.flightdesk.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "flightdesk" {
  certificate_arn         = aws_acm_certificate.flightdesk.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ALB security group — public HTTP/HTTPS
resource "aws_security_group" "alb" {
  name        = "flightdesk-alb-dev"
  description = "FlightDesk ALB - HTTP and HTTPS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "flightdesk-alb-dev", Environment = "dev" }
}

resource "aws_lb" "flightdesk" {
  name               = "flightdesk-dev"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  tags = { Name = "flightdesk-dev", Environment = "dev" }
}

resource "aws_lb_target_group" "flightdesk" {
  name     = "flightdesk-dev"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
  }
}

resource "aws_lb_target_group_attachment" "flightdesk" {
  target_group_arn = aws_lb_target_group.flightdesk.arn
  target_id        = aws_instance.flightdesk_dev.id
  port             = 80
}

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.flightdesk.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener with ACM cert
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.flightdesk.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.flightdesk.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.flightdesk.arn
  }
}

# Route53 — apex and www alias to ALB
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "flightadmins.com"
  type    = "A"

  alias {
    name                   = aws_lb.flightdesk.dns_name
    zone_id                = aws_lb.flightdesk.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.flightadmins.com"
  type    = "A"

  alias {
    name                   = aws_lb.flightdesk.dns_name
    zone_id                = aws_lb.flightdesk.zone_id
    evaluate_target_health = true
  }
}
