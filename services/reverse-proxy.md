# Reverse Proxy Setup

A reverse proxy acts as a traffic director for your VPS. It routes external HTTP/HTTPS requests (e.g., `app.yourdomain.com`) to the correct internal Docker containers, while handling SSL/TLS encryption automatically.

Here are the two recommended reverse proxy solutions:

---

## Option A: Nginx Proxy Manager (Web-UI)
Great for beginners who prefer a simple web dashboard.

### 1. Create a Directory
```bash
mkdir -p ~/homelab/nginx-proxy-manager
cd ~/homelab/nginx-proxy-manager
```

### 2. Create the Compose File
```bash
nano docker-compose.yml
```

Paste the following configuration:
```yaml
version: '3.8'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80' # Public HTTP Port
      - '443:443' # Public HTTPS Port
      - '81:81' # Admin Web UI Port
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

### 3. Deploy
```bash
docker compose up -d
```
Access the admin portal at `http://<YOUR_VPS_IP>:81`.

---

## Option B: Caddy Server (Config-File)
A lightweight, lightning-fast proxy that automatically obtains Let's Encrypt certificates using a simple configuration file.

### 1. Create a Compose File
```yaml
version: '3.8'
services:
  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./caddy_data:/data
      - ./caddy_config:/config
```

### 2. Example Caddyfile configuration
```text
app.yourdomain.com {
    reverse_proxy localhost:8080
}
```
