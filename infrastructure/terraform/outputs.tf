output "instance_id" {
  value = aws_instance.flightdesk_dev.id
}

output "ami_id" {
  value = data.aws_ami.al2023.id
}

output "alb_dns" {
  value = aws_lb.flightdesk.dns_name
}

output "domain" {
  value = "https://flightadmins.com"
}
