import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Homelab & VPS Wiki",
  description: "A comprehensive guide for VPS configuration, homelab setup, and command execution sequences.",
  cleanUrls: true,
  ignoreDeadLinks: true,
  appearance: 'dark',
  base: '/homelab-wiki/',
  themeConfig: {
    siteTitle: 'Homelab & VPS Wiki',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'VPS Setup', link: '/vps/hardening' },
      { text: 'Services', link: '/services/docker' }
    ],
    sidebar: [
      {
        text: 'VPS Configuration',
        collapsed: false,
        items: [
          { text: 'Provider Cleanup', link: '/vps/provider-cleanup' },
          { text: 'Initial OS Hardening', link: '/vps/hardening' },
          { text: 'DNS Configuration', link: '/vps/dns-setup' },
          { text: 'Essential Packages', link: '/vps/essential-packages' },
          { text: 'Benchmark (YABS)', link: '/vps/yabs' },
          { text: 'Swizzin Setup', link: '/vps/swizzin' },
          { text: 'Firewall Setup', link: '/vps/firewall' },
          { text: 'Kernel Tuning (BBR)', link: '/vps/kernel-tuning' },
          { text: 'Advanced NIC Tuning', link: '/vps/nic-tuning' },
          { text: 'SSD Storage Tuning', link: '/vps/ssd-tuning' },
          { text: 'Advanced CPU Tuning', link: '/vps/cpu-tuning' },
          { text: 'Post-Reboot Verification', link: '/vps/verification' },
          { text: 'Disk Space Maintenance', link: '/vps/maintenance' }
        ]
      },
      {
        text: 'Core Infrastructure',
        collapsed: false,
        items: [
          { text: 'Docker & Compose', link: '/services/docker' },
          { text: 'Reverse Proxy Setup', link: '/services/reverse-proxy' }
        ]
      },
      {
        text: 'Applications & Services',
        collapsed: true,
        items: [
          { text: 'Media Stack', link: '/apps/media' },
          { text: 'Sync & Backup', link: '/apps/backup' }
        ]
      },
      {
        text: 'Backup & Restore',
        collapsed: false,
        items: [
          { text: 'Linux System Configs', link: '/backup/system' },
          { text: 'Swizzin Seedbox Configs', link: '/backup/swizzin' },
          { text: 'Automated Telegram Backups', link: '/backup/automation' }
        ]
      },
      {
        text: 'Teldrive',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/teldrive/index' },
          { text: 'Prerequisites', link: '/teldrive/getting-started/prerequisites' },
          { text: 'Installation', link: '/teldrive/getting-started/installation' },
          { text: 'Usage', link: '/teldrive/getting-started/usage' },
          { text: 'Advanced Usage', link: '/teldrive/getting-started/advanced' },
          { text: 'Deploy with Caddy & CF', link: '/teldrive/guides/caddy-cloudflare' },
          { text: 'Deploy with Nginx', link: '/teldrive/guides/nginx-setup' },
          { text: 'Database Backup', link: '/teldrive/guides/db-backup' },
          { text: 'Setup with Rclone', link: '/teldrive/guides/rclone' },
          { text: 'Use with Media Servers', link: '/teldrive/guides/jellyfin' },
          { text: 'Android via Termux', link: '/teldrive/guides/teldrive-on-android' },
          { text: 'CLI: run', link: '/teldrive/cli/run' },
          { text: 'CLI: check', link: '/teldrive/cli/check' },
          { text: 'API Reference', link: 'https://teldrive-docs.pages.dev/docs/api' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },
    footer: {
      message: 'Homelab & VPS Live Run Guide',
      copyright: 'Copyright © 2026-present'
    },
    docFooter: {
      prev: 'Previous Page',
      next: 'Next Page'
    },
    outline: {
      level: [2, 3],
      label: 'On this page'
    }
  }
})
