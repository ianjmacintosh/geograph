# Deploying Geograph to Linode Nanode 1GB

## 📋 Prerequisites

1. **Linode Nanode 1GB** running Ubuntu 22.04 LTS
2. **Domain name** pointed to your Linode's IP address
3. **SSH access** to your server
4. **Git repository** with your code (GitHub, GitLab, etc.)

## 🚀 Quick Deployment

### Step 1: Prepare Your Code

1. **Commit and push** all changes to your git repository
2. **Update domain** in deployment files:
   ```bash
   # Replace "your-domain.com" with your actual domain in:
   # - deploy/nginx.conf
   # - deploy/deploy.sh
   ```

### Step 2: Upload Code to Server

**Option A: Git Clone (Recommended)**
```bash
# On your Linode server
sudo mkdir -p /opt/geograph
sudo chown $USER:$USER /opt/geograph
git clone https://github.com/ianjmacintosh/geograph.git /opt/geograph
```

**Option B: SCP Upload**
```bash
# From your local machine
scp -r /path/to/geograph imacinto@66.228.47.210:/tmp/
ssh imacinto@66.228.47.210 "sudo mv /tmp/geograph /opt/"
```

### Step 3: Run Deployment Script

```bash
# On your Linode server
cd /opt/geograph
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

**⚠️ Troubleshooting Common Issues:**

If you encounter "dubious ownership" git errors:
```bash
# Fix repository ownership (script creates 'geograph' user)
sudo chown -R geograph:geograph /opt/geograph
```

If build fails with "react-router: not found":
```bash
# Install all dependencies (including dev dependencies)
sudo -u geograph bash -c "cd /opt/geograph && npm ci"
sudo -u geograph bash -c "cd /opt/geograph && npm run build"
```

The script will:
- ✅ Install Node.js 20, Nginx, PM2
- ✅ Create application user and directories  
- ✅ Install dependencies and build app
- ✅ Configure Nginx reverse proxy
- ✅ Set up PM2 process management
- ✅ Configure firewall and swap file
- ✅ Start all services

### Step 4: Configure SSL

After your domain is pointed to the server:

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Verify Deployment

1. **Check services:**
   ```bash
   sudo -u geograph pm2 status
   sudo systemctl status nginx
   ```

2. **Check logs:**
   ```bash
   sudo -u geograph pm2 logs
   sudo tail -f /var/log/nginx/access.log
   ```

3. **Test website:**
   - Visit `https://your-domain.com`
   - Create a game and test WebSocket connection

## 📊 Monitoring on Nanode 1GB

### System Resources
```bash
# Check memory usage
free -h

# Check disk usage  
df -h

# Check CPU usage
top

# Check app memory
sudo -u geograph pm2 monit
```

### Performance Tips

1. **Monitor memory:**
   ```bash
   # Apps will auto-restart if memory exceeds limits
   # WebSocket server: 200MB limit
   # React app: 300MB limit
   ```

2. **Database cleanup:**
   ```bash
   # Games older than 6 hours are auto-cleaned
   # Adjust in production.env if needed
   ```

3. **Scale if needed:**
   - **10-15 players**: Nanode 1GB is perfect
   - **20-30 players**: Consider Linode 2GB ($12/month)
   - **50+ players**: Upgrade to 4GB ($24/month)

## 🔧 Maintenance Commands

### App Management
```bash
# Restart applications
sudo -u geograph pm2 restart all

# View logs
sudo -u geograph pm2 logs --lines 50

# Update app (after git push)
cd /opt/geograph
sudo -u geograph git pull
sudo -u geograph npm ci --production
sudo -u geograph npm run build
sudo -u geograph pm2 restart all
```

### Nginx Management
```bash
# Test config
sudo nginx -t

# Reload config
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx
```

### Database Backup
```bash
# Backup database
sudo cp /var/lib/geograph/geograph.db /var/backups/geograph-$(date +%Y%m%d).db

# Restore database
sudo cp /var/backups/geograph-YYYYMMDD.db /var/lib/geograph/geograph.db
sudo chown geograph:geograph /var/lib/geograph/geograph.db
sudo -u geograph pm2 restart all
```

## 🛠 Troubleshooting

### Common Issues

1. **WebSocket connection failed:**
   - Check firewall: `sudo ufw status`
   - Check Nginx config: `sudo nginx -t`
   - Check WebSocket server: `sudo -u geograph pm2 logs geograph-websocket`

2. **High memory usage:**
   - Check PM2 status: `sudo -u geograph pm2 monit`
   - Restart apps: `sudo -u geograph pm2 restart all`
   - Add more swap: `sudo fallocate -l 2G /swapfile2`

3. **SSL certificate issues:**
   - Renew certificate: `sudo certbot renew`
   - Check expiry: `sudo certbot certificates`

### Log Locations
- **App logs**: `sudo -u geograph pm2 logs`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `sudo journalctl -u nginx`

## 💰 Cost Breakdown

- **Linode Nanode 1GB**: $5/month
- **Domain name**: $10-15/year
- **SSL certificate**: Free (Let's Encrypt)
- **Total**: ~$5.83/month

Perfect for a multiplayer geography game serving 10-20 concurrent players! 🌍🎮