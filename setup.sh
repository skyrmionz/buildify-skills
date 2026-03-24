#!/usr/bin/env bash
set -e

BOLD="\033[1m"
DIM="\033[2m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"
RED="\033[31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}buildify${RESET} — agent setup"
echo ""

# --- Step 1: Build the MCP server ---
echo -e "${CYAN}[1/4]${RESET} Building MCP server..."

if ! command -v node &>/dev/null; then
  echo -e "${RED}✗${RESET} Node.js not found. Install Node.js 20+ and try again."
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}✗${RESET} Node.js $NODE_VERSION found, but 20+ is required."
  exit 1
fi

npm install --silent 2>/dev/null
npm run build --silent 2>/dev/null
echo -e "${GREEN}✓${RESET} MCP server built  ${DIM}→ dist/index.js${RESET}"

# --- Step 2: Install ADLC skills ---
echo -e "${CYAN}[2/4]${RESET} Installing Agentforce ADLC skills..."

ADLC_OK=true

if ! command -v python3 &>/dev/null; then
  echo -e "${YELLOW}⚠${RESET} Python 3 not found — skipping ADLC install."
  echo -e "  ${DIM}Install Python 3.9+ and re-run to add ADLC skills.${RESET}"
  ADLC_OK=false
fi

if [ "$ADLC_OK" = true ]; then
  PY_VERSION=$(python3 -c 'import sys; print(sys.version_info.minor)' 2>/dev/null || echo "0")
  if [ "$PY_VERSION" -lt 9 ]; then
    echo -e "${YELLOW}⚠${RESET} Python 3.$PY_VERSION found, but 3.9+ is required — skipping ADLC install."
    ADLC_OK=false
  fi
fi

if [ "$ADLC_OK" = true ]; then
  INSTALL_URL="https://raw.githubusercontent.com/almandsky/agentforce-adlc/main/tools/install.sh"
  if curl -sSL "$INSTALL_URL" | bash 2>/dev/null; then
    echo -e "${GREEN}✓${RESET} ADLC skills installed  ${DIM}→ /adlc-author, /adlc-deploy, /adlc-test, +5 more${RESET}"
  else
    echo -e "${YELLOW}⚠${RESET} ADLC install encountered an issue. You can retry manually:"
    echo -e "  ${DIM}curl -sSL $INSTALL_URL | bash${RESET}"
  fi
fi

# --- Step 3: Install Salesforce development skills ---
echo -e "${CYAN}[3/4]${RESET} Installing Salesforce development skills..."

if command -v npx &>/dev/null; then
  if npx -y skills add Jaganpro/sf-skills 2>/dev/null; then
    echo -e "${GREEN}✓${RESET} SF skills installed  ${DIM}→ 33 skills (Apex, Flow, LWC, Data Cloud, +more)${RESET}"
  else
    echo -e "${YELLOW}⚠${RESET} sf-skills install encountered an issue. You can retry manually:"
    echo -e "  ${DIM}npx skills add Jaganpro/sf-skills${RESET}"
  fi
else
  echo -e "${YELLOW}⚠${RESET} npx not found — skipping sf-skills install."
  echo -e "  ${DIM}Install Node.js 20+ and run: npx skills add Jaganpro/sf-skills${RESET}"
fi

# --- Step 4: Install Data 360 query scripts ---
SETUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${CYAN}[4/4]${RESET} Installing Data 360 query skills..."

if [ -d "$SETUP_DIR/data-360" ]; then
  mkdir -p .skills
  cp "$SETUP_DIR/data-360/"*.sh .skills/ 2>/dev/null || true
  chmod +x .skills/*.sh 2>/dev/null || true
  echo -e "${GREEN}✓${RESET} Data 360 scripts installed  ${DIM}→ .skills/dc-query.sh, dc-describe.sh, dc-list-objects.sh${RESET}"
else
  echo -e "${YELLOW}⚠${RESET} data-360/ directory not found — skipping Data 360 scripts."
fi

# --- Done ---
echo ""
echo -e "${GREEN}${BOLD}✓ Setup complete!${RESET}"
echo ""
echo -e "Next steps:"
echo -e "  1. Get a token from the Buildify app  ${DIM}(open CLI drawer → type 'sync agent')${RESET}"
echo -e "  2. Connect your agent:"
echo ""
echo -e "  ${BOLD}Claude Code:${RESET}"
echo -e "  ${DIM}claude mcp add buildify -s user \\${RESET}"
echo -e "  ${DIM}  -e DEMO_TOOL_TOKEN=<your-token> \\${RESET}"
echo -e "  ${DIM}  -e APP_URL=https://demo-building-app-f0300aa3e343.herokuapp.com \\${RESET}"
echo -e "  ${DIM}  -- node \$(pwd)/dist/index.js${RESET}"
echo ""
echo -e "  ${BOLD}Claude Desktop / Cursor:${RESET}  see README.md for JSON config"
echo ""
