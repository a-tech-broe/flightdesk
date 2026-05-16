#!/bin/bash
# EC2 initial setup script for Amazon Linux 2023
# Run once as ec2-user after instance launch

set -e

echo "==> Updating system..."
sudo dnf update -y

echo "==> Installing Docker..."
sudo dnf install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

echo "==> Installing Docker Compose plugin..."
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "==> Creating app directory..."
sudo mkdir -p /app
sudo chown ec2-user:ec2-user /app

echo "==> Done. Log out and back in for Docker group to take effect."
echo ""
echo "Next steps:"
echo "  1. Clone the repo:  git clone <your-repo-url> /app/flightdesk"
echo "  2. Copy .env:       cp /app/flightdesk/.env.example /app/flightdesk/.env"
echo "  3. Edit .env with production values"
echo "  4. Add SSL certs to nginx/ssl/ (fullchain.pem, privkey.pem)"
echo "  5. Start:           cd /app/flightdesk && docker compose up -d"
echo ""
echo "Generate a SECRET_KEY with:  openssl rand -hex 32"
