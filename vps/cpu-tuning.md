# Advanced CPU & Interrupt Tuning

This guide disables CPU vulnerability mitigations for a 5% to 15% increase in raw processing cycles and provides a consolidated hardware configuration daemon.

---

## Step 1: Disable CPU Interrupt Mitigations

Modern Linux kernels contain software workarounds for hardware vulnerabilities (Spectre, Meltdown, MDS, L1TF, etc.). These mitigations add processing overhead to every single network system call. Disabling them recovers substantial CPU capacity on your 4-core VPS.

> [!WARNING]
> **Security Risk:** Only disable mitigations if your VPS is dedicated strictly to torrent racing/private tasks and does not execute untrusted user code (e.g. shared hosting).

Open the GRUB configuration file:
```bash
sudo nano /etc/default/grub
```

Find the line starting with `GRUB_CMDLINE_LINUX_DEFAULT` and append `mitigations=off`. For example:
```text
GRUB_CMDLINE_LINUX_DEFAULT="maybe-existing-flags mitigations=off"
```
Save and exit the file.

Update GRUB configuration and reboot the system to apply:
```bash
# Update grub configuration
sudo update-grub

# Reboot the VPS
sudo reboot
```

---

## Step 2: Consolidated Startup Service

To make all network and SSD configurations persistent across system restarts, we will merge them into a single consolidated systemd service. This unites the optimizations from the network interface tuning and SSD I/O tuning guides.

Open the existing file:
```bash
sudo nano /etc/systemd/system/network-tuning.service
```

Replace its contents with the following consolidated configuration:
```ini
[Unit]
Description=Consolidated Hardware Performance Tuning (NIC & SSD)
After=network.target

[Service]
Type=oneshot
# --- Network Interface Configuration ---
ExecStart=/usr/sbin/ethtool -K ens192 rx-checksum on tx-checksum-ip-generic on
ExecStartPost=/usr/sbin/ethtool -K ens192 sg on tso on gso on gro on lro off
ExecStartPost=/usr/sbin/ethtool -G ens192 rx 4096 tx 4096
   
# --- SSD I/O and Read-Ahead Optimization ---
ExecStartPost=/bin/sh -c 'echo none > /sys/block/sda/queue/scheduler'
ExecStartPost=/sbin/blockdev --setra 256 /dev/sda
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```
Save and exit.

Reload the systemd manager and restart the service to apply changes immediately:
```bash
sudo systemctl daemon-reload
sudo systemctl restart network-tuning.service
```


