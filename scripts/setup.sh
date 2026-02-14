#!/bin/bash
# ClawTime Setup Script
# Usage: ./scripts/setup.sh

set -e

echo "🦞 ClawTime Setup"
echo "=================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DATA_DIR="$HOME/.clawtime"
CLAWTIME_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Step 1: Create data directory
mkdir -p "$DATA_DIR/avatars"

# Step 2: Get gateway token
echo -e "\n${YELLOW}Step 1: Gateway Token${NC}"
EXISTING_TOKEN=$(grep -o '"token":"[^"]*"' ~/.openclaw/openclaw.json 2>/dev/null | cut -d'"' -f4 | head -1 || true)

if [ -n "$EXISTING_TOKEN" ]; then
    echo -e "Found existing token: ${GREEN}${EXISTING_TOKEN:0:8}...${NC}"
    GW_TOKEN="$EXISTING_TOKEN"
else
    GW_TOKEN=$(openssl rand -hex 24)
    echo -e "Generated new token: ${GREEN}${GW_TOKEN:0:8}...${NC}"
    echo -e "${YELLOW}Add this token to ~/.openclaw/openclaw.json under gateway.auth.token${NC}"
fi

# Step 3: Get bot info
echo -e "\n${YELLOW}Step 2: Bot Configuration${NC}"
read -p "Bot name [ClawTime]: " BOT_NAME
BOT_NAME="${BOT_NAME:-ClawTime}"

read -p "Bot emoji [🦞]: " BOT_EMOJI
BOT_EMOJI="${BOT_EMOJI:-🦞}"

# Step 4: Tunnel URL (optional for now)
echo -e "\n${YELLOW}Step 3: Tunnel URL${NC}"
echo "If using ngrok/cloudflare tunnel, enter the URL (or leave empty to set later):"
read -p "Tunnel URL: " PUBLIC_URL

# Step 5: Generate setup token
SETUP_TOKEN=$(openssl rand -hex 16)

# Step 6: Write .env
cat > "$DATA_DIR/.env" << EOF
GATEWAY_TOKEN=$GW_TOKEN
BOT_NAME=$BOT_NAME
BOT_EMOJI=$BOT_EMOJI
PUBLIC_URL=$PUBLIC_URL
SETUP_TOKEN=$SETUP_TOKEN
EOF

echo -e "\n${GREEN}Created $DATA_DIR/.env${NC}"

# Step 7: Create systemd service
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/clawtime.service << EOF
[Unit]
Description=ClawTime Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$CLAWTIME_DIR
EnvironmentFile=$DATA_DIR/.env
ExecStart=/usr/bin/node server.js
KillSignal=SIGTERM
TimeoutStopSec=120
Restart=always
EOF

systemctl --user daemon-reload
systemctl --user enable clawtime

echo -e "${GREEN}Created systemd service${NC}"

# Step 8: Configure gateway allowedOrigins if PUBLIC_URL is set
if [ -n "$PUBLIC_URL" ]; then
    echo -e "\n${YELLOW}Configuring gateway...${NC}"
    if command -v openclaw &> /dev/null; then
        openclaw config set gateway.controlUi.allowedOrigins "[\"$PUBLIC_URL\"]" 2>/dev/null || true
        echo -e "${GREEN}Added $PUBLIC_URL to gateway allowedOrigins${NC}"
    else
        echo -e "${YELLOW}Run manually: openclaw config set gateway.controlUi.allowedOrigins '[\"$PUBLIC_URL\"]'${NC}"
    fi
fi

# Step 9: Start service
echo -e "\n${YELLOW}Starting ClawTime...${NC}"
systemctl --user start clawtime
sleep 2

if systemctl --user is-active --quiet clawtime; then
    echo -e "${GREEN}✅ ClawTime is running${NC}"
else
    echo -e "${RED}❌ Failed to start. Check: journalctl --user -u clawtime${NC}"
    exit 1
fi

# Done
echo -e "\n${GREEN}=================="
echo -e "Setup Complete!"
echo -e "==================${NC}"

if [ -n "$PUBLIC_URL" ]; then
    echo -e "\nSetup URL: ${PUBLIC_URL}?setup=${SETUP_TOKEN}"
else
    echo -e "\nSetup token: $SETUP_TOKEN"
    echo -e "${YELLOW}Set PUBLIC_URL in $DATA_DIR/.env and restart to get full URL${NC}"
fi

echo -e "\nNext steps:"
echo "  1. Open the setup URL on your phone"
echo "  2. Register your passkey (Face ID / fingerprint)"
echo "  3. Add to home screen for app-like experience"
echo ""
echo "Docs: SKILL.md"
