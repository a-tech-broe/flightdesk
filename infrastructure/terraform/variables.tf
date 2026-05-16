variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m5.xlarge"
}

variable "key_pair_name" {
  description = "Name of existing EC2 key pair"
  type        = string
}

variable "eip_allocation_id" {
  description = "Allocation ID of the existing Elastic IP (eipalloc-xxxxx)"
  type        = string
}
