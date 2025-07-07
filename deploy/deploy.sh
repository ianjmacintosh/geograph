#!/bin/bash

# Geograph Deployment Script for Nanode 1GB
# Run this on your Linode server

set -e  # Exit on any error

echo "🚀 Starting Geograph deployment..."

# Configuration
APP_DIR="/opt/geograph"
APP_USER="geograph"
DOMAIN="ecobox.ianjmacintosh.com"  # Replace with your actual domain
DB_DIR="/var/lib/geograph"
LOG_DIR="/var/log/geograph"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_status "Please run as a regular user with sudo privileges"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
print_status "Installing Nginx..."
sudo apt-get install -y nginx

# Install PM2 globally
print_status "Installing PM2..."
sudo npm install -g pm2

# Install build tools
print_status "Installing build tools..."
sudo apt-get install -y build-essential git certbot python3-certbot-nginx

# Create application user
print_status "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd -r -s /bin/bash -d $APP_DIR $APP_USER
fi

# Create directories
print_status "Creating application directories..."
sudo mkdir -p $APP_DIR $DB_DIR $LOG_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR $DB_DIR $LOG_DIR

# Clone or update repository
print_status "Setting up application code..."
if [ -d "$APP_DIR/.git" ]; then
    print_status "Updating existing repository..."
    sudo -u $APP_USER git -C $APP_DIR pull
else
    print_status "Cloning repository..."
    # You'll need to replace this with your actual git repository
    print_warning "Please manually copy your code to $APP_DIR or set up git repository"
    sudo mkdir -p $APP_DIR
fi

# Set ownership
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# Install dependencies and build
print_status "Installing dependencies..."
sudo -u $APP_USER bash -c "cd $APP_DIR && npm ci --production"

print_status "Building application..."
sudo -u $APP_USER bash -c "cd $APP_DIR && npm run build"

# Copy environment file
print_status "Setting up environment..."
sudo cp $APP_DIR/deploy/production.env $APP_DIR/.env
sudo chown $APP_USER:$APP_USER $APP_DIR/.env

# Setup Nginx
print_status "Configuring Nginx..."
sudo cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/geograph
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/geograph
sudo ln -sf /etc/nginx/sites-available/geograph /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Setup SSL with Let's Encrypt (run after domain is pointed to server)
print_warning "SSL setup will be done manually after domain configuration"

# Setup PM2
print_status "Setting up PM2..."
sudo -u $APP_USER bash -c "cd $APP_DIR && pm2 start deploy/ecosystem.config.js"
sudo -u $APP_USER pm2 save
sudo -u $APP_USER pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $APP_USER --hp $APP_DIR

# Setup swap file for memory safety
print_status "Setting up swap file..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable

# Start services
print_status "Starting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx

print_status "✅ Deployment complete!"
print_warning "Next steps:"
echo "1. Point your domain to this server's IP address"
echo "2. Run: sudo certbot --nginx -d $DOMAIN"
echo "3. Update WebSocket URL in your app to use wss://$DOMAIN/ws"
echo "4. Test the application at https://$DOMAIN"
echo ""
print_status "Useful commands:"
echo "- Check app status: sudo -u $APP_USER pm2 status"
echo "- View logs: sudo -u $APP_USER pm2 logs"
echo "- Restart app: sudo -u $APP_USER pm2 restart all"
echo "- Check Nginx: sudo nginx -t && sudo systemctl status nginx"