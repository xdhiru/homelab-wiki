# Post-Reboot Verification

After applying all performance configurations (sshd_config, sysctl profiles, ethtool offloads, SSD schedulers, and GRUB mitigations) and rebooting your VPS, run these validation commands to verify that the settings applied correctly and successfully persisted.

---

## 1. Verify Startup Service
Check if your custom `network-tuning.service` executed successfully during bootup:

```bash
sudo systemctl status network-tuning.service
```

### Expected Output:
*   **Active**: `active (exited)` (in green). Since this is a `oneshot` script, it runs its optimization commands once during boot and exits cleanly.
*   **Exit Status**: `status=0/SUCCESS`. This confirms every command (ethtool, ring buffers, SSD scheduler) executed without errors.

---

## 2. Verify NIC Offloads & Buffers
Ensure your network card interface settings have scaled up to the hardware maximums:

```bash
# Check ring buffer sizes
sudo ethtool -g ens192 | grep -A 4 "Current hardware settings"

# Check transmit queue length (txqueuelen)
ip link show ens192 | grep -o "qlen [0-9]*"
```

### Expected Output:
```text
Current hardware settings:
RX:             4096
TX:             4096
```
*(Mini and Jumbo RX ring values can be ignored as they are not used).*

And the queue length query should return:
```text
qlen 10000
```

---

## 3. Verify SSD I/O Scheduler
Check if the system disk I/O scheduler has successfully bypassed the guest operating system queues:

```bash
cat /sys/block/sda/queue/scheduler
```

### Expected Output:
```text
[none] mq-deadline
```
*The active scheduler must show `none` (or `noop`) surrounded by brackets, indicating requests bypass local scheduling queues directly to the host hypervisor.*

---

## 4. Verify BBR and Fair Queueing (FQ)
Verify that the BBR TCP congestion control algorithm and the FQ packet scheduler are active:

### Check Live Kernel Variables:
```bash
sysctl net.core.default_qdisc net.ipv4.tcp_congestion_control
```
**Expected Output:**
```text
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
```

### Check Active Connection Pacing:
Run the socket statistics command to inspect live network connections:
```bash
ss -t -i
```
**What to look for:**
Look at the end of the text blocks for your active network connections. You should see `bbr` explicitly mentioned inside the brackets alongside active pacing and delivery metrics:
```text
ESTAB  0  0  12.34.56.78:22003  98.76.54.32:50778
     bbr wscale:8,13 rto:408 rtt:207.983/16.037 ... bbr:(bw:1.06Mbps,mrtt:181.601,pacing_gain:2.88672,cwnd_gain:2.88672) pacing_rate 3.04Mbps delivery_rate 1.06Mbps
```

### Check NIC Driver Binding:
Ensure the network interface card driver has bound to the `fq` scheduler:
```bash
tc qdisc show dev ens192
```
**Expected Output (Multi-Queue mq root with child fq schedulers):**
```text
qdisc mq 0: root
qdisc fq 0: parent :4 limit 10000p flow_limit 100p buckets 1024 ...
qdisc fq 0: parent :3 limit 10000p flow_limit 100p ...
qdisc fq 0: parent :2 limit 10000p ...
qdisc fq 0: parent :1 limit 10000p ...
```
*(If it lists `qdisc fq`, BBR is actively pacing outbound network packets at the interface queue layer).*
