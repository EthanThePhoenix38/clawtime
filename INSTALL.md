# ClawTime Installation

Webchat interface for OpenClaw with passkey auth, 3D avatars, and voice mode.

## Quick Start

```bash
cd ~/.openclaw/workspace
git clone https://github.com/youngkent/clawtime.git
cd clawtime
npm install
./scripts/setup.sh
```

The setup script will:
- Prompt for bot name and emoji
- Configure gateway token
- Create systemd service
- Start ClawTime

## Tunnel Setup (Required for Remote Access)

For access outside localhost, set up a tunnel:

**Option A: ngrok (stable URL)**
```bash
ngrok http 3000 --domain=your-subdomain.ngrok-free.dev
```

**Option B: Cloudflare quick tunnel (free, URL changes on restart)**
```bash
cloudflared tunnel --url http://localhost:3000
```

Then update config with your tunnel URL:
```bash
sed -i 's|^PUBLIC_URL=.*|PUBLIC_URL=https://YOUR-TUNNEL-URL|' ~/.clawtime/.env
openclaw config set gateway.controlUi.allowedOrigins '["https://YOUR-TUNNEL-URL"]'
systemctl --user restart clawtime openclaw-gateway
```

## Voice Mode (Optional)

Requires [whisper.cpp](https://github.com/ggerganov/whisper.cpp) for server-side STT:

```bash
cd /tmp && git clone https://github.com/ggerganov/whisper.cpp.git && cd whisper.cpp
make && bash ./models/download-ggml-model.sh base.en

sudo tee /usr/local/bin/whisper-transcribe << 'EOF'
#!/bin/bash
/tmp/whisper.cpp/main -m /tmp/whisper.cpp/models/ggml-base.en.bin -f "$1" --no-timestamps -otxt 2>/dev/null
cat "${1}.txt" && rm -f "${1}.txt"
EOF
sudo chmod +x /usr/local/bin/whisper-transcribe
```

Falls back to browser SpeechRecognition if unavailable.

---

See **[SKILL.md](./SKILL.md)** for widgets, avatars, and operational details.
