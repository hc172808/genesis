#!/bin/bash

# ==========================================
# Update system
# ==========================================
sudo apt update
sudo apt upgrade -y

# ==========================================
# Install required packages
# ==========================================
sudo apt install -y \
    git \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential

# ==========================================
# Install Docker
# ==========================================
curl -fsSL https://get.docker.com | sudo sh

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# (Optional) Run Docker without sudo
sudo usermod -aG docker $USER

echo "Log out and back in if you want to use Docker without sudo."

# ==========================================
# Clone repository
# ==========================================
git clone https://github.com/hc172808/fullnode.git gyds-boostnode

cd gyds-boostnode

# ==========================================
# Build Docker image
# ==========================================
docker build \
    -t gyds-boostnode:latest \
    --build-arg CHAIN_ID=13370 \
    --build-arg ENABLE_MINING=false \
    .

# ==========================================
# Run Boost Node
# ==========================================
docker volume create gyds-boostnode-data

docker run -d \
    --name gyds-boostnode \
    --cap-add NET_ADMIN \
    -e WG_SERVER_ENDPOINT=192.168.18.128:51820 \
    -v gyds-boostnode-data:/var/lib/gydschain \
    --restart unless-stopped \
    gyds-boostnode:latest

# ==========================================
# Verify
# ==========================================
docker ps

docker logs -f gyds-boostnode
