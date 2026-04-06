# Self-Hosting Biblio with Public HTTPS Access

## Quick Start

### Option A: Cloudflare Tunnel (Recommended, Free)

1. **Install cloudflared:**
   ```bash
   # Linux (Debian/Ubuntu)
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb

   # macOS
   brew install cloudflared
   ```

2. **Start the server with tunnel:**
   ```bash
   cd /home/illicit_comms/projects/biblio/development/web
   ./start-with-tunnel.sh
   ```

3. **Copy the HTTPS URL** that cloudflared outputs (looks like `https://something.trycloudflare.com`)

---

### Option B: ngrok (Easiest, Free Tier)

1. **Sign up at https://ngrok.com** (free account)

2. **Install ngrok:**
   ```bash
   # Linux
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok

   # macOS
   brew install ngrok
   ```

3. **Authenticate:**
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

4. **Start the server:**
   ```bash
   # Terminal 1: Start Next.js
   cd /home/illicit_comms/projects/biblio/development/web
   npm run dev

   # Terminal 2: Start ngrok
   ngrok http 3000
   ```

5. **Copy the HTTPS URL** from ngrok output

---

### Option C: Direct Exposure (Not Recommended)

If your router supports it, you can:
1. Forward port 3000 on your router
2. Use your public IP address
3. **Security risk:** No HTTPS, no DDoS protection

---

## Configure Telegram Mini App URL

Once you have a public HTTPS URL (from ngrok, Cloudflare Tunnel, etc.):

1. **Open BotFather** in Telegram
2. **Send:** `/mybots`
3. **Select your bot**
4. **Select:** `Mini App` → `Configure`
5. **Update the URL** to your new HTTPS URL
6. **Save**

---

## Database Persistence

The database is stored at:
```
/home/illicit_comms/projects/biblio/development/web/public/biblio.db
```

**Backup regularly:**
```bash
cp public/biblio.db ~/biblio-backup-$(date +%Y%m%d).db
```

---

## Systemd Service (Auto-start on boot)

To run Biblio automatically on boot:

1. Create `/etc/systemd/system/biblio.service`:
   ```ini
   [Unit]
   Description=Biblio Self-Hosted Server
   After=network.target

   [Service]
   Type=simple
   User=YOUR_USERNAME
   WorkingDirectory=/home/illicit_comms/projects/biblio/development/web
   ExecStart=/usr/bin/npm run dev
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl enable biblio
   sudo systemctl start biblio
   ```
