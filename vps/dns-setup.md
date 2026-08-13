# DNS Configuration & Optimization

This guide configures your VPS to route DNS queries directly through Cloudflare and Google DNS while completely disabling systemd-resolved's local stub listener. This eliminates loopback overhead on port 53 and ensures DHCP lease updates never overwrite your custom configuration.

---

## Step 1: Optimize Systemd-Resolved Configuration
`systemd-resolved` can run in the background to handle system level name resolution requests, but by default it runs a local DNS stub listener on `127.0.0.53:53`. Setting `DNSStubListener=no` disables this local stub server, freeing up port 53 and reducing system overhead.

Open the resolved configuration file:
```bash
sudo nano /etc/systemd/resolved.conf
```

Delete the default contents and replace them with this clean, optimized configuration:
```ini
[Resolve]
DNS=1.1.1.1 8.8.8.8
FallbackDNS=1.0.0.1 8.8.4.4
Domains=~.
LLMNR=no
MulticastDNS=no
DNSSEC=no
DNSOverTLS=no
Cache=no
DNSStubListener=no
```
Save and close the file (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 2: Create a Static resolv.conf File
By default, `/etc/resolv.conf` is a symlink managed by the operating system. We will delete this link and create a static text file pointing directly to the Anycast DNS IP addresses.

Force-delete the existing configuration symlink:
```bash
sudo rm -f /etc/resolv.conf
```

Create a brand-new, empty `/etc/resolv.conf` file:
```bash
sudo nano /etc/resolv.conf
```

Paste these lines inside to configure primary routes and quick failover:
```text
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 1.0.0.1
options timeout:1 attempts:2
```
Save and close the file (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 3: Lock the Configuration from Overwrites
In cloud VPS environments, NetworkManager or DHCP client scripts frequently overwrite `/etc/resolv.conf` when updating DHCP leases. Lock this configuration using the Linux system immutable attribute:

```bash
sudo chattr +i /etc/resolv.conf
```

> [!TIP]
> **To edit in the future:** If you ever need to change your DNS servers later, you must unlock the file first:
> ```bash
> sudo chattr -i /etc/resolv.conf
> ```

---

## Step 4: Restart the Resolution Daemon
Reload the system configuration manager and restart the resolution daemon to apply the parameters:

```bash
# Reload systemd manager configuration
sudo systemctl daemon-reload

# Restart and enable systemd-resolved
sudo systemctl restart systemd-resolved
sudo systemctl enable systemd-resolved
```

---

## Step 5: Sanity Check & Latency Verification
Verify that DNS resolution is working properly and measure connection latency to the Redacted (RED) private tracker:

```bash
ping -c 3 flacsfor.me
```
*If this resolves and returns successful ping replies, your optimized DNS routing is active and functional!*
