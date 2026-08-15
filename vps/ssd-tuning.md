# SSD Storage & I/O Tuning

High-speed torrent racing at 10Gbps results in a massive volume of concurrent disk writes (from active downloads) and reads (from active uploads). To prevent disk I/O bottlenecks from throttling your speeds, we must optimize the VPS virtual drive.

This guide configures direct hypervisor pass-through, expands the read-ahead buffer, and optimizes partition mount flags.

> [!NOTE]
> **Identify Your Disk Name**: The commands below use `/dev/sda` and `/sys/block/sda` as examples. Run `lsblk` to identify your active drive (it could be `/dev/vda` or `/dev/nvme0n1` on NVMe-based VPS) and modify paths accordingly.

---

## Step 1: Change Linux I/O Scheduler to `none`
Standard Linux kernels use schedulers like `bfq` or `mq-deadline`, which calculate queuing orders optimized for spinning hard drives. For a virtual SSD on a guest VPS, these schedulers introduce CPU overhead. 

Setting the scheduler to `none` (or `noop`) passes raw block requests directly to the host hypervisor's drive engine.

First, check your current active scheduler:
```bash
cat /sys/block/sda/queue/scheduler
```
*The active scheduler will be shown in brackets, e.g. `[mq-deadline]`.*

Temporarily change it to `none`:
```bash
echo "none" | sudo tee /sys/block/sda/queue/scheduler
```

---

## Step 2: Optimize Disk Read-Ahead (Random I/O Optimization)
Because SSDs have virtually zero seek latency (unlike old mechanical hard drives), they do not need massive read-ahead buffers to hide physical arm movement delays. 

Furthermore, BitTorrent downloads and uploads pieces in **random blocks**. If read-ahead is set to a large value (like 4MB), every time a peer requests a random 16KB block, the OS will read the requested block *plus* the next 4MB of sequential data from the SSD. This creates massive **read amplification**, saturating your shared VPS storage bandwidth.
*   **The Solution**: Reduce read-ahead to a conservative, stable default of **128KB (256 sectors)**. This prevents excessive read overhead while keeping standard OS look-ahead functional.

Run this command to set the read-ahead buffer to 256 sectors on `/dev/sda`:
```bash
sudo blockdev --setra 256 /dev/sda
```

Verify the setting:
```bash
sudo blockdev --getra /dev/sda
# Should output 256
```

---

## Step 3: Make Settings Permanent (Systemd Service)
To ensure the scheduler and read-ahead buffers persist when your VPS restarts, add them directly to our existing `network-tuning.service` file.

Open the service file:
```bash
sudo nano /etc/systemd/system/network-tuning.service
```

Modify the `[Service]` section to include the SSD optimizations:
```ini
[Unit]
Description=Network and SSD I/O Hardware Tuning
After=network.target

[Service]
Type=oneshot
# --- Network Interface Configuration ---
ExecStart=/usr/sbin/ethtool -K ens192 rx-checksum on tx-checksum-ip-generic on
ExecStartPost=/usr/sbin/ethtool -K ens192 sg on tso on gso on gro on lro off
ExecStartPost=/usr/sbin/ethtool -G ens192 rx 4096 tx 4096
ExecStartPost=/sbin/ip link set dev ens192 txqueuelen 10000

# --- SSD I/O and Read-Ahead Optimization ---
ExecStartPost=/bin/sh -c 'echo none > /sys/block/sda/queue/scheduler'
ExecStartPost=/sbin/blockdev --setra 256 /dev/sda
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```
Save and exit the file.

Reload systemd and restart the service to apply:
```bash
sudo systemctl daemon-reload
sudo systemctl restart network-tuning.service
```

---

## Step 4: Optimize Mount Options in `/etc/fstab`
By default, Linux writes metadata to disk updating the "last accessed time" (`atime`) of every file or folder whenever it is read. During torrenting, this causes a constant stream of redundant disk write operations.

Adding `noatime` and `nodiratime` completely disables these write operations.

Open your filesystem table:
```bash
sudo nano /etc/fstab
```

Find the line corresponding to your root partition (`/`) or torrent download partition. Append `noatime,nodiratime` to the options column (usually column 4). For example:
```text
# Before:
UUID=1234-abcd...  /  ext4  defaults  0  1

# After:
UUID=1234-abcd...  /  ext4  defaults,noatime,nodiratime  0  1
```
Save and exit.

Reload the systemd daemon to sync your `/etc/fstab` changes with systemd mount unit configurations:
```bash
sudo systemctl daemon-reload
```

Now, remount the partition immediately to apply the new options:
```bash
sudo mount -o remount /
```
