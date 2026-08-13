---
layout: home
---

<style>
  .landing-dashboard {
    display: flex;
    gap: 64px;
    max-width: 1250px;
    margin: 100px auto;
    padding: 0 40px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  .hero-panel {
    flex: 1 1 500px;
    min-width: 320px;
  }
  .features-panel {
    flex: 1 1 450px;
    min-width: 320px;
    max-width: 520px;
  }
  .card-item {
    margin-bottom: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    background: var(--vp-c-bg-soft);
    border: 1px solid var(--vp-c-divider);
    border-left: 3px solid var(--vp-c-brand-1);
    transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  }
  .card-item:hover {
    transform: translateY(-2px);
    border-color: var(--vp-c-brand-1);
    background: var(--vp-c-bg-mute);
  }
  .action-btn-primary {
    display: inline-block;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 24px;
    color: #ffffff !important;
    background: var(--vp-c-brand-1) !important;
    transition: filter 0.2s ease;
  }
  .action-btn-primary:hover {
    filter: brightness(1.15);
  }
  .action-btn-secondary {
    display: inline-block;
    padding: 12px 28px;
    font-size: 0.95rem;
    font-weight: 600;
    text-decoration: none;
    border-radius: 24px;
    color: var(--vp-c-text-1) !important;
    background: var(--vp-c-bg-soft) !important;
    border: 1px solid var(--vp-c-divider);
    transition: background-color 0.2s ease;
  }
  .action-btn-secondary:hover {
    background-color: var(--vp-c-bg-mute);
  }
</style>

<div class="landing-dashboard">

<!-- Left Column: Compact Hero Panel -->
<div class="hero-panel">
<h1 style="font-size: 3.8rem; font-weight: 800; line-height: 1.15; margin: 0 0 20px 0; letter-spacing: -0.02em;">
<span style="background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Homelab & VPS</span><br>
<span style="color: var(--vp-c-text-1);">Wiki</span>
</h1>
<p style="font-size: 1.25rem; color: var(--vp-c-text-2); line-height: 1.6; margin: 0 0 32px 0; font-weight: 450;">
A structured reference for server hardening, containerized services, and automated backups.
</p>
<div class="actions" style="display: flex; gap: 14px; flex-wrap: wrap;">
<a href="/homelab-wiki/vps/hardening" class="action-btn-primary">Start VPS Hardening</a>
<a href="/homelab-wiki/backup/automation" class="action-btn-secondary">Backup Automation</a>
</div>
</div>

<!-- Right Column: Compact Feature Cards -->
<div class="features-panel">

<a href="/homelab-wiki/vps/hardening" style="text-decoration: none; display: block;">
<div class="card-item">
<h3 style="font-size: 1.15rem; margin: 0 0 6px 0; color: var(--vp-c-text-1); font-weight: 600;">🛡️ VPS Hardening</h3>
<p style="margin: 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.55;">SSH security, UFW rules, users, and kernel tuning.</p>
</div>
</a>

<a href="/homelab-wiki/services/docker" style="text-decoration: none; display: block;">
<div class="card-item">
<h3 style="font-size: 1.15rem; margin: 0 0 6px 0; color: var(--vp-c-text-1); font-weight: 600;">🐳 Container Infrastructure</h3>
<p style="margin: 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.55;">Docker Compose settings, networks, and storage limits.</p>
</div>
</a>

<a href="/homelab-wiki/services/reverse-proxy" style="text-decoration: none; display: block;">
<div class="card-item">
<h3 style="font-size: 1.15rem; margin: 0 0 6px 0; color: var(--vp-c-text-1); font-weight: 600;">🔗 Reverse Proxy & SSL</h3>
<p style="margin: 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.55;">Traffic routing via Nginx and Caddy with SSL renewals.</p>
</div>
</a>

<a href="/homelab-wiki/vps/swizzin" style="text-decoration: none; display: block;">
<div class="card-item">
<h3 style="font-size: 1.15rem; margin: 0 0 6px 0; color: var(--vp-c-text-1); font-weight: 600;">📦 Seedbox & Applications</h3>
<p style="margin: 0; color: var(--vp-c-text-2); font-size: 0.9rem; line-height: 1.55;">Swizzin performance tuning, clients, and database backups.</p>
</div>
</a>

</div>

</div>
