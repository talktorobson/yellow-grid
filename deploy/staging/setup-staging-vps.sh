#!/bin/bash
# ============================================================
# Staging VPS Setup Script
# Run this once on a fresh VPS to set up the staging environment
# Usage: ssh root@staging-vps 'bash -s' < setup-staging-vps.sh
# ============================================================

set -e

echo "🚀 Setting up Yellow Grid Staging Environment..."

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Create app directory
mkdir -p /root/yellow-grid
mkdir -p /root/backups

# Add swap for memory safety (2GB)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "✅ Swap configured"
fi

# Configure Docker log rotation
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker

# Create systemd service for auto-restart
cat > /etc/systemd/system/yellow-grid-staging.service << 'EOF'
[Unit]
Description=Yellow Grid Staging
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/yellow-grid/deploy/staging
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable yellow-grid-staging

# Setup daily cleanup cron
cat > /etc/cron.daily/docker-cleanup << 'EOF'
#!/bin/bash
docker system prune -af --volumes --filter "until=72h"
EOF
chmod +x /etc/cron.daily/docker-cleanup

echo "✅ Staging VPS setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your SSH key for deployments"
echo "2. Configure DNS: staging.goexec.de -> $(curl -s ifconfig.me)"
echo "3. Add GitHub secrets for CI/CD"
echo "4. Push to main branch to trigger first deployment"
