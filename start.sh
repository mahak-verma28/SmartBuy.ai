#!/usr/bin/env bash

# ===================================================================
#                   SmartBuy.AI  —  Start Script
#  Starts: MongoDB + AI Agent (Python/FastAPI) + Backend (Node/Express)
#          + Frontend (Vite)
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

# ── Python / venv check ──────────────────────────────────────────────
AGENT_DIR="$SCRIPT_DIR/Backend/agent"
VENV_DIR="$AGENT_DIR/.venv"
PYTHON_BIN=""

# Prefer venv python, then python3, then python
if [ -f "$VENV_DIR/bin/python" ]; then
  PYTHON_BIN="$VENV_DIR/bin/python"
  AGENT_UVICORN="$VENV_DIR/bin/uvicorn"
elif command -v python3 &>/dev/null; then
  PYTHON_BIN="$(command -v python3)"
  AGENT_UVICORN="uvicorn"
elif command -v python &>/dev/null; then
  PYTHON_BIN="$(command -v python)"
  AGENT_UVICORN="uvicorn"
fi

AGENT_AVAILABLE=false
if [ -n "$PYTHON_BIN" ]; then
  log_info "Python   $($PYTHON_BIN --version 2>&1)"
  AGENT_AVAILABLE=true
else
  log_warn "Python not found — AI Agent will be skipped (legacy Decodo fallback active)"
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

# ── Step 1: Python AI Agent ──────────────────────────────────────────
AGENT_PID=""
log_section "[ 1/3 ] Starting AI Agent  (Python FastAPI — Groq + Playwright)"

if [ "$AGENT_AVAILABLE" = true ]; then

  # ── Create venv if it doesn't exist ──
  if [ ! -d "$VENV_DIR" ]; then
    log_warn "Python venv not found — creating $VENV_DIR ..."
    $PYTHON_BIN -m venv "$VENV_DIR"
    log_info "venv created"
  fi

  # ── Install / upgrade requirements ──
  if [ ! -f "$VENV_DIR/.requirements_installed" ] || \
     [ "$AGENT_DIR/requirements.txt" -nt "$VENV_DIR/.requirements_installed" ]; then
    log_warn "Installing Python agent dependencies (this may take 1-2 min first time)..."
    "$VENV_DIR/bin/pip" install --quiet --upgrade pip
    "$VENV_DIR/bin/pip" install --quiet -r "$AGENT_DIR/requirements.txt"
    touch "$VENV_DIR/.requirements_installed"
    log_info "Python dependencies installed"

    # Install Playwright Chromium browser binary
    log_warn "Installing Playwright Chromium browser (one-time, ~130 MB)..."
    "$VENV_DIR/bin/python" -m playwright install chromium 2>/dev/null || true
    log_info "Playwright Chromium ready"
  fi

  # ── Kill any stale process on port 5001 ──
  if lsof -ti :5001 &>/dev/null; then
    log_warn "Port 5001 already in use — clearing stale process..."
    lsof -ti :5001 | xargs kill -9 2>/dev/null || true
    sleep 2
  fi

  # ── Launch the FastAPI sidecar (CWD-independent via --app-dir) ──
  PYTHONUNBUFFERED=1 "$VENV_DIR/bin/uvicorn" main_agent:app \
    --host 0.0.0.0 --port 5001 --log-level warning \
    --app-dir "$AGENT_DIR" \
    > /tmp/smartbuy_agent.log 2>&1 &
  AGENT_PID=$!
  sleep 6

  if kill -0 "$AGENT_PID" 2>/dev/null; then
    log_info "AI Agent  started  (PID ${BOLD}$AGENT_PID${RESET}) → http://localhost:5001"
  else
    log_warn "AI Agent failed to start — backend will use Decodo fallback"
    log_warn "Agent log: $(cat /tmp/smartbuy_agent.log 2>/dev/null | tail -5)"
    AGENT_PID=""
  fi

else
  log_warn "Skipping AI Agent — no Python found"
fi

# ── Step 2: Backend ──────────────────────────────────────────────────
log_section "[ 2/3 ] Starting Backend  (Node/Express + MongoDB)"

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
log_section "[ 3/3 ] Starting Frontend  (Vite dev server)"

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
if [ -n "$AGENT_PID" ]; then
echo -e "     AI Agent  (Groq+PW)     →  ${BOLD}http://localhost:5001${RESET}    PID $AGENT_PID"
else
echo -e "     AI Agent                →  ${YELLOW}Not running — Decodo fallback active${RESET}"
fi
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
  [ -n "$AGENT_PID" ]    && kill "$AGENT_PID"    2>/dev/null || true
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$AGENT_PID" ]    && wait "$AGENT_PID"    2>/dev/null || true
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
