#!/usr/bin/env bash

# ===================================================================
#                   SmartBuy.AI  —  Start Script
#  Starts: MongoDB + Backend (Node/Express) + Frontend (Vite)
# ===================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colours ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}==================================================================${RESET}"
  echo -e "${CYAN}${BOLD}              SmartBuy.AI  —  One-Click Launcher                  ${RESET}"
  echo -e "${CYAN}${BOLD}==================================================================${RESET}"
  echo ""
}

log_info()    { echo -e "  ${GREEN}✔${RESET}  $*"; }
log_warn()    { echo -e "  ${YELLOW}⚠${RESET}  $*"; }
log_error()   { echo -e "  ${RED}✖${RESET}  $*"; }
log_section() { echo -e "\n${BOLD}$*${RESET}"; }

# ── Pre-flight checks ────────────────────────────────────────────────
banner

log_section "[ Pre-flight checks ]"

if ! command -v node &>/dev/null; then
  log_error "Node.js is not installed or not in PATH."
  exit 1
fi
log_info "Node.js  $(node --version)"

if ! command -v npm &>/dev/null; then
  log_error "npm is not found."
  exit 1
fi
log_info "npm      $(npm --version)"

if command -v mongod &>/dev/null; then
  log_info "MongoDB  $(mongod --version | head -1)"
else
  log_warn "mongod binary not found in PATH (MongoDB may still be running as a service)"
fi

# ── Step 0: MongoDB ──────────────────────────────────────────────────
log_section "[ 0/3 ] Ensuring MongoDB is running"

MONGO_STARTED_BY_US=false

if sudo systemctl is-active --quiet mongod 2>/dev/null; then
  log_info "mongod service is already running"
else
  log_warn "mongod is not running — attempting to start via systemctl..."
  if sudo systemctl start mongod 2>/dev/null; then
    sleep 2
    if sudo systemctl is-active --quiet mongod; then
      log_info "mongod started successfully"
      MONGO_STARTED_BY_US=true
    else
      log_warn "systemctl start failed — trying direct mongod launch..."
      mkdir -p /tmp/smartbuy-db /tmp/smartbuy-db-log
      mongod --dbpath /tmp/smartbuy-db --logpath /tmp/smartbuy-db-log/mongod.log --fork --quiet 2>/dev/null || true
      sleep 2
      if pgrep -x mongod &>/dev/null; then
        log_info "mongod launched (data: /tmp/smartbuy-db — non-persistent across reboots)"
        MONGO_STARTED_BY_US=true
      else
        log_warn "Could not start MongoDB — backend will fall back to in-memory mode"
      fi
    fi
  fi
fi

# ── Step 1: Backend ──────────────────────────────────────────────────
log_section "[ 1/2 ] Starting Backend  (Node/Express + MongoDB)"

BACKEND_DIR="$SCRIPT_DIR/Backend"

if [ ! -f "$BACKEND_DIR/server.js" ]; then
  log_error "Backend/server.js not found."
  exit 1
fi

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  log_warn "node_modules missing — installing backend dependencies..."
  npm --prefix "$BACKEND_DIR" install
fi

cd "$BACKEND_DIR"
node server.js &
BACKEND_PID=$!

sleep 3
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  log_error "Backend failed to start."
  exit 1
fi
log_info "Backend  started  (PID ${BOLD}$BACKEND_PID${RESET})"

# ── Step 3: Frontend ─────────────────────────────────────────────────
log_section "[ 2/2 ] Starting Frontend  (Vite dev server)"

FRONTEND_DIR="$SCRIPT_DIR/Frontent"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  log_error "Frontent/package.json not found."
  kill "$BACKEND_PID" 2>/dev/null
  [ -n "$AGENT_PID" ] && kill "$AGENT_PID" 2>/dev/null
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  log_warn "node_modules missing — installing frontend dependencies..."
  npm --prefix "$FRONTEND_DIR" install
fi

chmod -R +x "$FRONTEND_DIR/node_modules/.bin/" 2>/dev/null || true

cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  log_error "Frontend failed to start."
  kill "$BACKEND_PID" 2>/dev/null
  [ -n "$AGENT_PID" ] && kill "$AGENT_PID" 2>/dev/null
  exit 1
fi
log_info "Frontend started  (PID ${BOLD}$FRONTEND_PID${RESET})"

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}==================================================================${RESET}"
echo -e "${GREEN}${BOLD}  ✔  All services are running!${RESET}"
echo ""
echo -e "     Database  (MongoDB)     →  ${BOLD}mongodb://127.0.0.1:27017/smartbuy_db${RESET}"
echo -e "     Backend  (API)          →  ${BOLD}http://localhost:5000${RESET}    PID $BACKEND_PID"
echo -e "     Frontend (UI)           →  ${BOLD}http://localhost:5173${RESET}    PID $FRONTEND_PID"
echo ""
echo -e "     ${YELLOW}Press Ctrl+C to stop all services gracefully.${RESET}"
echo -e "${CYAN}${BOLD}==================================================================${RESET}"
echo ""

# ── Graceful Shutdown ─────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down SmartBuy services...${RESET}"
  [ -n "$AGENT_PID" ] 2>/dev/null || true
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID"  2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  # Only stop mongod if we started it
  if [ "$MONGO_STARTED_BY_US" = true ]; then
    sudo systemctl stop mongod 2>/dev/null || true
    log_info "MongoDB stopped"
  fi
  echo -e "${GREEN}All services stopped. Goodbye!${RESET}"
  echo ""
}

trap cleanup SIGINT SIGTERM

wait
