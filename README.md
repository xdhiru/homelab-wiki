# Homelab & VPS Wiki

A performance-focused documentation portal built with VitePress to centralize configurations for server hardening, core container networks, Swizzin seedbox optimizations, and automated backup pipelines.

Styled with a custom amber-yellow accent palette and configured for dark mode by default, the interface utilizes a responsive side-by-side layout designed for desktop workflows.

---

## Technical Specifications & Guides

### VPS Hardening & Security
*   **Operating System Hardening:** Clean deployment setups, package pruning, custom SSH configurations, and user privilege isolation.
*   **Security Policies:** Stateful firewall configuration with UFW and kernel-level network optimizations (including TCP BBR congestion control).

### Container Infrastructure
*   **Orchestration:** Standardized Docker & Docker Compose setup templates.
*   **Isolation:** Network configuration, custom volume paths, and resource containment limits.

### Reverse Proxy & SSL Routing
*   **Traffic Routing:** Unified ingress configurations using Caddy and Nginx.
*   **Security:** Cloudflare proxy integration, automatic SSL certificate renewals, and SSL validation pathways.

### Swizzin Seedbox Performance
*   **Network Optimization:** Tuning TCP socket buffer margins and send/write watermarks for high-throughput interfaces.
*   **Swarm Economics:** BitTorrent client modifications using round-robin choking algorithms and custom disk queues.

### Automated Backups
*   **State Encryption:** Consolidated shell scripts to archive and encrypt system databases and configurations.
*   **Transport Pipeline:** Scheduled cron jobs to automate encrypted deliveries directly to Telegram private channels.

### Teldrive Orchestration
*   **Integrations:** Multi-session API configurations, CLI commands reference, database replication, and termux support.
*   **Mounts:** Rclone caching structures and media server library setup (Jellyfin).

---

## Local Development

Ensure **Node.js (v18+)** and **npm** are installed prior to starting the local build.

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
Launches a hot-reloading dev server at `http://localhost:5174`:
```bash
npm run dev
```

### 3. Compile Production Bundle
Builds the static distribution files into `.vitepress/dist`:
```bash
npm run build
```

### 4. Preview Locally
Preview the production build locally:
```bash
npm run preview
```

---

## Directory Structure

```text
├── .vitepress/          # Configuration parameters and stylesheet extensions
│   ├── config.mts       # Global site configurations, search parameters, and sidebars
│   ├── theme/
│   │   ├── index.ts     # Custom theme entrypoint
│   │   └── custom.css   # Main design tokens (amber accents, dark mode overrides)
│   └── public/          # Public assets, icons, and logo
├── apps/                # Documentation for media stacks and sync services
├── backup/              # Automation scripts and restore sequences
├── services/            # Docker, Compose, and reverse proxy guidelines
├── teldrive/            # Teldrive API, CLI, and integration guides
├── vps/                 # VPS cleanup, security hardening, and resource tuning
├── index.md             # Custom dashboard home layout
├── LICENSE              # MIT License terms
└── README.md            # Repository documentation
```

## Deployment

Automatic builds and deployments are managed via GitHub Actions to GitHub Pages.

---

## License

This project is licensed under the [MIT License](file:///g:/personal-wiki/LICENSE).
