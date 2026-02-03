# Deployment Guide

This guide covers deploying Mummy to various platforms.

## Table of Contents

- [Railway.com](#railwaycom)
- [Docker](#docker)
- [DigitalOcean](#digitalocean)
- [AWS](#aws)
- [Heroku](#heroku)

---

## Railway.com

Railway is the easiest deployment option.

### Prerequisites
- GitHub account
- Railway account (https://railway.app)
- MongoDB database (use Railway's MongoDB service)

### Steps

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create mummy --private --source=. --push
   ```

2. **Create Railway Project**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Add MongoDB service: Click "+ New" → "Database" → "MongoDB"

3. **Set Environment Variables**
   - Go to your service → Variables
   - Add all required variables from `.env.example`
   - Railway will auto-set `MONGODB_URI` from the MongoDB service

4. **Deploy**
   - Railway will auto-deploy on every push to main
   - Get your public URL from the service dashboard

5. **Configure Twilio Webhook**
   - Copy your Railway URL (e.g., `https://mummy-production.up.railway.app`)
   - Go to Twilio Console → WhatsApp Settings
   - Set webhook: `https://your-railway-url.railway.app/webhook/whatsapp`

---

## Docker

### Using Docker Compose (Recommended)

1. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Start services**
   ```bash
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f mummy
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

### Using Docker only

1. **Build image**
   ```bash
   docker build -t mummy .
   ```

2. **Run container**
   ```bash
   docker run -d \
     --name mummy \
     -p 8000:8000 \
     --env-file .env \
     mummy
   ```

3. **View logs**
   ```bash
   docker logs -f mummy
   ```

---

## DigitalOcean

### App Platform

1. **Create App**
   - Go to DigitalOcean → Apps → Create App
   - Connect GitHub repository
   - Select "mummy" repo

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm start`
   - HTTP Port: `8000`

3. **Add MongoDB**
   - Click "Create Resources" → Database
   - Select MongoDB
   - Connect to your app

4. **Set Environment Variables**
   - Add all variables from `.env.example`

5. **Deploy**
   - Click "Create Resources"
   - Wait for deployment
   - Configure Twilio webhook with your App URL

### Droplet (VPS)

1. **Create Droplet**
   - Ubuntu 22.04 LTS
   - At least 1GB RAM

2. **SSH into droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install dependencies**
   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs

   # Install MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   apt update
   apt install -y mongodb-org
   systemctl start mongod
   systemctl enable mongod

   # Install PM2
   npm install -g pm2
   ```

4. **Clone and setup**
   ```bash
   git clone https://github.com/YOUR-USERNAME/mummy.git
   cd mummy
   npm install
   cp .env.example .env
   nano .env  # Edit with your credentials
   npm run build
   ```

5. **Start with PM2**
   ```bash
   pm2 start dist/index.js --name mummy
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx reverse proxy**
   ```bash
   apt install -y nginx certbot python3-certbot-nginx

   # Create Nginx config
   nano /etc/nginx/sites-available/mummy
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   ln -s /etc/nginx/sites-available/mummy /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx

   # Get SSL certificate
   certbot --nginx -d your-domain.com
   ```

---

## AWS

### Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB**
   ```bash
   eb init -p node.js-18 mummy
   ```

3. **Create environment**
   ```bash
   eb create mummy-prod
   ```

4. **Set environment variables**
   ```bash
   eb setenv TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx ANTHROPIC_API_KEY=xxx MONGODB_URI=xxx
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### ECS (Docker)

1. **Build and push image to ECR**
   ```bash
   aws ecr create-repository --repository-name mummy
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com
   docker build -t mummy .
   docker tag mummy:latest YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/mummy:latest
   docker push YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/mummy:latest
   ```

2. **Create ECS task definition and service** via AWS Console

---

## Heroku

1. **Install Heroku CLI**
   ```bash
   brew tap heroku/brew && brew install heroku  # macOS
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create app**
   ```bash
   heroku create mummy-health-bot
   ```

4. **Add MongoDB**
   ```bash
   heroku addons:create mongodb:sandbox
   ```

5. **Set environment variables**
   ```bash
   heroku config:set TWILIO_ACCOUNT_SID=xxx
   heroku config:set TWILIO_AUTH_TOKEN=xxx
   heroku config:set ANTHROPIC_API_KEY=xxx
   ```

6. **Deploy**
   ```bash
   git push heroku main
   ```

7. **View logs**
   ```bash
   heroku logs --tail
   ```

---

## Post-Deployment

### Configure Twilio Webhook

After deploying to any platform:

1. Get your public URL
2. Go to Twilio Console → Messaging → WhatsApp → Settings
3. Set "When a message comes in" to: `https://your-url.com/webhook/whatsapp`
4. Method: `POST`
5. Save

### Monitoring

Check health endpoint:
```bash
curl https://your-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Troubleshooting

**Bot not responding:**
- Check logs for errors
- Verify webhook URL is correct
- Test health endpoint
- Check environment variables

**Database errors:**
- Verify MongoDB connection string
- Check MongoDB is running
- Verify network access (IP whitelist for MongoDB Atlas)

**API errors:**
- Verify API keys are correct
- Check API quotas/limits
- Review error logs

---

## Security Checklist

Before going to production:

- [ ] All environment variables set
- [ ] HTTPS enabled
- [ ] Twilio signature verification enabled
- [ ] MongoDB authentication enabled
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Backups enabled
- [ ] Monitoring set up
- [ ] SSL certificates valid
- [ ] Firewall configured

---

Need help? Check the [README](README.md) or open an issue!
