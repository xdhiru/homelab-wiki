# Self-Hosted Media Stack

This guide shows how to deploy a full self-hosted media server stack using Docker. It includes Prowlarr (indexer manager), Radarr (movies), Sonarr (TV shows), and Jellyfin (media player).

---

## Directory Structure
To keep media and configurations clean, set up your folder structure first:

```bash
mkdir -p ~/homelab/media
cd ~/homelab/media
mkdir -p config/{prowlarr,radarr,sonarr,jellyfin} data/{downloads,movies,tv}
```

---

## Docker Compose File
Create a `docker-compose.yml` file:

```yaml
version: "3.8"
services:
  # Indexer Manager
  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config/prowlarr:/config
    ports:
      - 9696:9696
    restart: unless-stopped

  # Movie Downloader
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config/radarr:/config
      - ./data:/data
    ports:
      - 7878:7878
    restart: unless-stopped

  # TV Show Downloader
  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config/sonarr:/config
      - ./data:/data
    ports:
      - 8989:8989
    restart: unless-stopped

  # Media Player (Jellyfin)
  jellyfin:
    image: lscr.io/linuxserver/jellyfin:latest
    container_name: jellyfin
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
    volumes:
      - ./config/jellyfin:/config
      - ./data/movies:/data/movies
      - ./data/tv:/data/tv
    ports:
      - 8096:8096
    restart: unless-stopped
```

---

## Deploy and Access
Start the stack in detached mode:

```bash
docker compose up -d
```

### Port Mappings
*   **Prowlarr:** `http://<YOUR_VPS_IP>:9696`
*   **Radarr:** `http://<YOUR_VPS_IP>:7878`
*   **Sonarr:** `http://<YOUR_VPS_IP>:8989`
*   **Jellyfin:** `http://<YOUR_VPS_IP>:8096`
