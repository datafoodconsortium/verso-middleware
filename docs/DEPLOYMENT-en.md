# Deployment Guide

Guide for deploying the Verso Middleware in production.

---

## Deployment Method

### Docker Compose (Required)

**⚠️ All environments use Docker Compose**

**📋 Prerequisites:**
- Docker 20+
- Docker Compose 1.29+
- Valid Verso API key
- Docker network `dfc_shared_network`

**🎯 Advantages:**
- Standardized configuration
- Isolated environment
- Automatic dependency management
- Shared network with other DFC services
- Automatic restart

---

## Prepare Deployment

### 1. Obtain a Verso API Key

**Where to get it:**
Contact Verso (https://verso-optim.com/)

**What you need:**
- Verso API URL (provided by Verso)
- Authentication key

**Important:** This key is **confidential**, never commit it to git.

---

### 2. Prepare Configuration

The middleware requires a JSON configuration file with 4 parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `VERSO_OPTIM_API_URL` | Verso API URL | `https://api.verso-optim.com/vrp/v1/solve` |
| `VERSO_API_KEY` | Your Verso API key | `your-api-key` |
| `CONTEXT_JSON_URL` | DFC context URL | `https://cdn.jsdelivr.net/.../context.json` |
| `JSONLD_BASE` | Base URI for IDs | `http://verso-middleware.your-domain.com` |

**Location:** `../secrets/production/config-verso.json`

**⚠️ Security:**
- Configuration stored in `@secrets` repository (private)
- Mounted as Docker volume: `../secrets/production/config-verso.json:/app/config.json`
- Never commit to public repository

**Reference:** See `config.example.json` for complete structure

---

### 3. Prepare Infrastructure

**Network:**
- Port 3001 available (or custom)
- Outbound access to Verso API
- Outbound access to jsdelivr CDN (for DFC context)

**Security:**
- Configured firewall
- SSL/TLS certificate if publicly exposed
- Reverse proxy (Nginx recommended)

---

## Deployment with Docker Compose

### Docker Compose Files

| File | Usage | Command |
|------|-------|----------|
| `docker-compose.yml` | **Development** (auto-reload) | `yarn dev` |
| `docker-compose-test.yml` | **Tests** | `yarn test` |
| `docker-compose-prod.yml` | **Production** | `yarn start` |

**Common configuration:**
- Image: `node:20-slim`
- Port: `3001`
- Configuration: Mounted from `../secrets/production/config-verso.json`
- Network: `dfc_shared_network` (external, shared)

---

### Production Deployment Steps

#### 1. Prepare Configuration

**Create secrets folder:**
```
mkdir -p ../secrets/production
```

**Create configuration file:**
Copy `config.example.json` to `../secrets/production/config-verso.json` and fill in your Verso API key.

**Reference:** See file `config.example.json` for complete structure

#### 2. Create Docker Network

If you have other DFC services (prototype, etc.), creating a shared network allows inter-service communication.

Command available in main README.

#### 3. Start Service

Use Docker Compose with production file (`docker-compose-prod.yml`).

**The service will:**
- Download Node.js image
- Install dependencies
- Start server on port 3001
- Connect to Docker network

#### 4. Verify Startup

**Verification methods:**
- Check Docker logs
- Test `/health` endpoint
- Check Docker processes

---

### Service Management

**Common operations:**

| Action | Command |
|--------|----------|
| **Production** | `docker-compose -f docker-compose-prod.yml up -d` |
| **Development** | `docker-compose up` |
| **Tests** | `docker-compose -f docker-compose-test.yml up` |
| Stop | `docker-compose -f docker-compose-prod.yml down` |
| Restart | `docker-compose -f docker-compose-prod.yml restart` |
| View logs | `docker-compose -f docker-compose-prod.yml logs -f` |
| View status | `docker-compose -f docker-compose-prod.yml ps` |

**Reference:** Official Docker Compose documentation

---

## Advanced Configuration

### Reverse Proxy with Nginx

**Why a reverse proxy:**
- SSL/TLS termination
- Handle long timeouts
- Load balancing (if multiple instances)
- DDoS protection

**Architecture:**
```
Client → HTTPS (443) → Nginx → HTTP (3001) → Middleware
```

**Required Nginx configuration:**
- Proxy to localhost:3001
- Correctly configured X-Forwarded headers
- Increased timeout (120s recommended)

**Reference:** Nginx templates available online

---

### SSL/TLS with Let's Encrypt

**To expose the API in HTTPS:**

**Recommended tool:** Certbot

**Steps:**
1. Install Certbot
2. Obtain a certificate for your domain
3. Configure Nginx to use the certificate
4. Enable automatic renewal

**Important:** Domain must point to your server (DNS configured)

**Reference:** Let's Encrypt documentation

---

### Security

#### Firewall

**Ports to open:**
- 22 (SSH, administration)
- 80 (HTTP, redirect to HTTPS)
- 443 (HTTPS)

**Ports NOT to expose:**
- 3001 (middleware port, accessible only via Nginx)

**Reference:** UFW documentation (Ubuntu) or firewalld (CentOS)

#### API Key Protection

**Best practices:**
- ✅ Store in external file (`../secrets/`)
- ✅ Restrictive permissions (read-only, owner only)
- ✅ Never commit to git
- ✅ Use environment variables if possible

#### Rate Limiting

**Current status:** Not implemented by default

**Production recommendation:**
Configure rate limiting at Nginx level or in middleware (express-rate-limit).

**Objective:**
- Prevent abuse
- Control Verso API costs
- Protect against DDoS

**Reference:** express-rate-limit documentation

---

## Monitoring and Maintenance

### Service Monitoring

#### Health Check

**Endpoint:** `GET /health`

**To monitor:**
- Availability (uptime)
- Response time
- Error codes

**Recommended tools:**
- UptimeRobot (free)
- Pingdom
- Your host's integrated monitoring

#### Logs

**Application logs:**
- **Docker:** Logs accessible via Docker Compose
- **PM2:** Logs accessible via PM2 commands

**What to monitor:**
- 500 errors
- Warnings about invalid coordinates
- Verso API errors
- Timeouts

**Log rotation:** Configure rotation to avoid disk saturation

---

### Update

**Recommended process:**

1. **Backup current configuration**
2. **Retrieve new version** (git pull or new archive)
3. **Install dependencies** (in case of new ones)
4. **Restart service**
5. **Verify** that everything works

**Docker:** Rebuild image and restart container

**PM2:** Restart process

**Important:** Check [CHANGELOG](CHANGELOG-en.md) before any update (breaking changes?)

---

### Backup

**Elements to backup:**
- Configuration file `config.json` mounted from `@secrets`
- Logs (if analysis needed)

**Non-critical elements:**
- Code (recoverable from git)
- Node.js dependencies (reinstallable)

**Warning:** Do not backup Verso API key in clear text on an unsecured system.

---

## Troubleshooting

### Service Won't Start

**Checks:**
1. Valid configuration (well-formed JSON)
2. Verso API key present
3. Port 3001 available
4. Correct Node.js version (20+)

**Consult:** Error logs for details

---

### Optimization Errors

**If all requests fail:**

**Possible causes:**
- Invalid or expired Verso API key
- Verso service unavailable
- Network problem (firewall blocks Verso access)

**Actions:**
1. Test API key manually (curl to Verso)
2. Check middleware logs
3. Contact Verso if problem persists

---

### Degraded Performance

**Symptoms:** Very long response times

**Possible causes:**
- Overloaded Verso service
- Too many orders in a single request
- Undersized server

**Solutions:**
- Reduce number of orders per request
- Increase server resources
- Implement queue system

---

## Deployment Checklist

Before going to production, verify:

- [ ] Node.js 20+ installed (or Docker)
- [ ] Verso API key obtained and configured
- [ ] Configuration created and validated
- [ ] Service starts correctly
- [ ] Health check responds
- [ ] Test with example data succeeded
- [ ] Reverse proxy configured (if needed)
- [ ] SSL/HTTPS enabled (if public exposure)
- [ ] Firewall configured
- [ ] Monitoring configured
- [ ] Logs accessible and rotation configured
- [ ] Backup procedure defined
- [ ] Operations documentation written

---

## Support and Resources

### Documentation

- **Configuration:** `config.example.json`
- **Architecture:** [docs/ARCHITECTURE-en.md](ARCHITECTURE-en.md)
- **API:** [docs/API-en.md](API-en.md)

### Community

- **Issues:** [GitHub Issues](../../issues)
- **Discussions:** [GitHub Discussions](../../discussions)

### Providers

- **Verso:** https://verso-optim.com/
- **DFC:** https://datafoodconsortium.org/

