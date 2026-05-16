terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    key     = "flightdesk/dev/terraform.tfstate"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_eip" "existing" {
  id = var.eip_allocation_id
}

resource "aws_security_group" "flightdesk_dev" {
  name        = "flightdesk-dev"
  description = "FlightDesk dev - HTTP, HTTPS, SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

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

  tags = {
    Name        = "flightdesk-dev"
    Environment = "dev"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_instance" "flightdesk_dev" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.flightdesk_dev.id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 50
    delete_on_termination = true
  }

  user_data = file("${path.module}/userdata.sh")

  tags = {
    Name        = "flightdesk-dev"
    Environment = "dev"
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip_association" "flightdesk_dev" {
  instance_id   = aws_instance.flightdesk_dev.id
  allocation_id = var.eip_allocation_id
}
