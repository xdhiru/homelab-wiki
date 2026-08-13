# Kernel Tuning & 10Gbps Torrent Racing

This guide outlines advanced kernel and network tuning configurations optimized for a **10Gbps network pipe on an 8GB RAM, 4-Core VPS with a 100GB SSD (Geekbench 6 Multicore ~3500)**. 

When racing on private trackers with a high-bandwidth pipe, your main bottleneck is latency, disk I/O saturation, and kernel buffer constraints. These parameters adjust the Linux network stack and virtual memory parameters to maximize upload throughput to small numbers of fast peers while protecting RAM and SSD workloads.

---

## Step 1: Verify Current Settings
First, check what queuing discipline and congestion control algorithms are currently active on your VPS:

```bash
# Check current default queuing discipline
sysctl net.core.default_qdisc

# Check current TCP congestion control algorithm
sysctl net.ipv4.tcp_congestion_control
```
*By default, most Debian 12 virtual machines will output `cubic` for the TCP congestion control.*

---

## Step 2: Apply the 10Gbps Racing Profile
We will create a custom sysctl config file to overwrite the default kernel parameters on system boot.

Create the configuration file:
```bash
sudo nano /etc/sysctl.d/99-bbr.conf
```

Paste the following configurations into the file:

```text
# --- CORE BUFFER TUNING ---
net.core.rmem_default = 4194304
net.core.wmem_default = 4194304
net.core.rmem_max = 268435456
net.core.wmem_max = 268435456
net.ipv4.tcp_rmem = 4096 4194304 134217728
net.ipv4.tcp_wmem = 4096 4194304 134217728

# --- GLOBAL TCP POOL (Optimized: ~1.2GB Low / 1.5GB Pressure / 1.8GB Max) ---
net.ipv4.tcp_mem = 314572 393216 471859

# --- BBR & FAIR QUEUEING (Aggressive Racing Settings) ---
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_pacing_ss_ratio = 288
net.ipv4.tcp_pacing_ca_ratio = 125
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_no_metrics_save = 1
net.ipv4.tcp_autocorking = 0
net.ipv4.tcp_notsent_lowat = 131072
net.ipv4.tcp_limit_output_bytes = 1048576

# --- RACING PIPELINE OPTIMISATIONS ---
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 60000
net.core.netdev_budget = 1000
net.core.netdev_budget_usecs = 10000
net.ipv4.ipfrag_high_threshold = 33554432
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_sack = 1
net.ipv4.tcp_dsack = 1
net.ipv4.tcp_ecn = 2
net.ipv4.tcp_rfc1337 = 1
net.ipv4.tcp_adv_win_scale = 2

# --- RAM WRITE-CACHING TO PREVENT SSD BOTTLENECK ---
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.dirty_background_ratio = 5
vm.dirty_ratio = 20
vm.dirty_expire_centisecs = 1000
vm.dirty_writeback_centisecs = 100
```
Save the file and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 3: Apply the Configuration
Reload the kernel parameters without rebooting the system:

```bash
sudo sysctl --system
```

---

## Step 4: Verify the Tuning
Verify that BBR is successfully active and loaded:

```bash
# Check if congestion control is set to BBR
sysctl net.ipv4.tcp_congestion_control
# Should output: net.ipv4.tcp_congestion_control = bbr

# Check if the BBR kernel module is loaded in memory
lsmod | grep bbr
# Should show: tcp_bbr
```

---

## Step 5: Parameter Explanations (How this wins races)

### 1. Network Buffers (BDP Scaling)
When transferring data over a 10Gbps link to remote peers, latency (RTT) dictates how much data can sit in the network transit pipeline. 
*   **`net.core.wmem_max` / `rmem_max` (256MB)**: Allows individual TCP sockets to buffer up to 256MB of data. This allows single-stream TCP transfers to saturate the pipe even when connecting to high-latency peers.
*   **`tcp_wmem` / `tcp_rmem` (4MB Default)**: Initiates every new connection with a generous 4MB buffer, bypassing slow ramp-ups.

### 2. Networking Memory Safety
*   **`net.ipv4.tcp_mem` (~1.8GB Max)**: Tells the kernel that the total memory used by all TCP buffers combined must never exceed ~1.8GB. This represents a safe limit on an 8GB RAM VPS, leaving 6.2GB safely for the OS, Docker, and your torrent client application cache, preventing Out-Of-Memory (OOM) crashes during extreme network loads.
*   **`net.ipv4.tcp_fastopen = 3`**: Enables TCP Fast Open (TFO) for both incoming and outgoing connections. TFO allows data to be sent inside the initial `SYN` handshake packet, saving a full round-trip time (RTT) when building rapid peer connections during a race.

### 3. Pacing & Loss Handling
*   **`net.core.default_qdisc = fq`**: Fair Queueing scheduler. Required for BBR to pace packets smoothly without bufferbloat.
*   **`net.ipv4.tcp_congestion_control = bbr`**: Google's BBR paces packets dynamically based on actual network throughput rather than reacting aggressively to packet drops (which happens constantly on shared 10Gbps nodes).
*   **`net.ipv4.tcp_pacing_ss_ratio = 288` (288%)**: Sets the pacing rate multiplier during TCP Slow Start to the maximum aggressive kernel default of 2.88x estimated bandwidth. This forces BBR to ramp up upload speeds instantly to seize a leecher's available bandwidth before competing seedboxes.
*   **`net.ipv4.tcp_pacing_ca_ratio = 125` (125%)**: Sets the pacing multiplier during Congestion Avoidance to 1.25x. This keeps pacing headroom to probe for extra bandwidth safely without causing queue saturation.
*   **`net.ipv4.tcp_slow_start_after_idle = 0`**: Prevents the kernel from resetting the TCP window size to default after a brief pause in data transfer, allowing you to instantly burst files to new peers at full speed.
*   **`net.ipv4.tcp_autocorking = 0`**: Disables packet combining. Sends TCP packets immediately when ready, lowering latency and getting data out faster to win torrent chunk-request races.
*   **`net.ipv4.tcp_notsent_lowat = 131072` (128KB)**: Prevents packet queues inside the socket from getting too large, decreasing latency and maximizing pacing accuracy.

### 4. CPU & Thread Scheduling
*   **`net.core.netdev_max_backlog = 60000`**: Expands the network packet reception queue. Prevents the kernel from dropping packets at the network card interface level when hit by massive bursts of traffic.
*   **`net.core.netdev_budget = 1000` / `netdev_budget_usecs = 10000`**: Instructs the CPU to dedicate up to 10ms or 1000 packets per polling loop to network handling. This ensures network interrupts are handled quickly, reducing CPU-bound latency.

### 5. Memory & Disk I/O Protection
*   **`vm.swappiness = 10`**: Minimizes swap utilization to keep pages in RAM, preventing the slow SSD swap from causing disk read/write stalls.
*   **`vm.dirty_background_ratio = 5` / `vm.dirty_ratio = 20`**: Adjusts the system write cache. Because your SSD mixed write limit (~700 MB/s) is lower than your 10Gbps download limit (~1.25 GB/s), we allow up to 20% of RAM (~1.6GB) to buffer dirty write pages. Combined with a 1GB qBittorrent disk cache, this lets you absorb massive initial bursts in memory without saturating the OS or triggering OOM.
*   **`vm.dirty_expire_centisecs = 1000` / `vm.dirty_writeback_centisecs = 100`**: Forces the kernel writeback daemon to wake up every **1 second** (100 centisecs) and flush pages that are older than **10 seconds** (1000 centisecs). This keeps a constant, proactive drain stream to the SSD, preventing the RAM dirty buffer from saturating the 20% limit and freezing your client's threads.


