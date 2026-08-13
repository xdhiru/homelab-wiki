# Firewall Setup (UFW)

Setting up a firewall is one of the most critical steps in securing your VPS. This guide configures `UFW` (Uncomplicated Firewall) to block all unauthorized incoming connections while permitting necessary web traffic and custom SSH connections.

---

## 1. Install UFW
Most Debian/Ubuntu systems come with UFW pre-installed. If not, install it using:

```bash
sudo apt update && sudo apt install ufw -y
```

---

## 2. Set Default Policies
Configure UFW to deny all incoming traffic by default, but allow all outgoing traffic.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

---

## 3. Allow Essential Connections
Before enabling the firewall, you **must** allow your SSH port. Otherwise, you will be locked out of the server.

```bash
# Allow configured custom SSH port
sudo ufw allow 22003/tcp comment 'SSH Port'

# Allow web traffic (HTTP & HTTPS)
sudo ufw allow 80/tcp comment 'HTTP Port'
sudo ufw allow 443/tcp comment 'HTTPS Port'

# Allow WireGuard VPN traffic (UDP)
sudo ufw allow 51000/udp comment 'WireGuard VPN'

# Allow qBittorrent peer-to-peer traffic (TCP and UDP)
sudo ufw allow 55655 comment 'qBittorrent Incoming'
```

---

## 4. Enable UFW
With the rules set, enable the firewall:

```bash
sudo ufw enable
```
*Press `y` to confirm when prompted.*

Check the active firewall status and rules:
```bash
sudo ufw status verbose
```

---

## 5. Useful Firewall Commands
Here are a few quick reference commands:

*   **Block a specific IP address:**
    ```bash
    sudo ufw deny from 123.45.67.89 to any
    ```
*   **Allow a port from a specific IP (e.g., database port):**
    ```bash
    sudo ufw allow from 192.168.1.100 to any port 5432 proto tcp
    ```
*   **Disable the firewall:**
    ```bash
    sudo ufw disable
    ```
