output "instance_id" {
  value = aws_instance.flightdesk_dev.id
}

output "public_ip" {
  description = "Public IP of the EIP (same before and after association)"
  value       = data.aws_eip.existing.public_ip
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
