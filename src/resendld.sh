#!/bin/zsh
# resendld - Resend Email Listening Daemon
# Monitors configured Resend email boxes and delivers messages to OpenClaw gateway
# Usage: resendld [start|stop|restart|status|logs|box add|box list|box remove]

set -euo pipefail

# Configuration
INSTALL_PREFIX="${INSTALL_PREFIX:-$HOME/.local/bin/resendld}"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/resendld"
MAIL_DIR="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}/mail/inbox"
LOG_DIR="$INSTALL_PREFIX/logs"
PID_FILE="$INSTALL_PREFIX/.resendld.pid"
CONVEX_DIR="$INSTALL_PREFIX/web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$CONFIG_DIR" "$MAIL_DIR" "$LOG_DIR" "$INSTALL_PREFIX"

# Initialize config if missing
init_config() {
  if [[ ! -f "$CONFIG_DIR/boxes.json" ]]; then
    cat > "$CONFIG_DIR/boxes.json" << 'EOF'
{
  "boxes": [
    {
      "email": "user@domain.tld",
      "isActive": true,
      "lastSync": null
    }
  ]
}
EOF
    echo "✓ Initialized $CONFIG_DIR/boxes.json"
  fi
}

# Check if daemon is running
is_running() {
  [[ -f "$PID_FILE" ]] && kill -0 $(cat "$PID_FILE") 2>/dev/null
}

# Start the daemon
start_daemon() {
  if is_running; then
    echo -e "${YELLOW}resendld is already running (PID: $(cat "$PID_FILE"))${NC}"
    return 0
  fi

  init_config

  echo "Starting resendld daemon..."

  # Trap signals to cleanup child processes
  trap 'cleanup_processes' EXIT TERM INT
  
  cleanup_processes() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Shutting down..." >> "$LOG_DIR/daemon.log"
    [[ -f "$LOG_DIR/.convex.pid" ]] && kill $(cat "$LOG_DIR/.convex.pid") 2>/dev/null || true
    [[ -f "$LOG_DIR/.web.pid" ]] && kill $(cat "$LOG_DIR/.web.pid") 2>/dev/null || true
    [[ -f "$LOG_DIR/.listen.pid" ]] && kill $(cat "$LOG_DIR/.listen.pid") 2>/dev/null || true
  }

  # TODO: Convex dev server (requires cloud setup or local auth workaround)
  # (
  #   cd "$CONVEX_DIR"
  #   npx convex dev >> "$LOG_DIR/convex.log" 2>&1
  # ) &
  # echo $! > "$LOG_DIR/.convex.pid"

  # TODO: Web server (TanStack Start dev)
  # (
  #   cd "$CONVEX_DIR"
  #   bun run dev >> "$LOG_DIR/web.log" 2>&1
  # ) &
  # echo $! > "$LOG_DIR/.web.pid"

  # Start listening loop with auto-restart
  (
    while true; do
      echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting listening loop..." >> "$LOG_DIR/daemon.log"
      
      # Run the TypeScript listening handler
      if command -v bun &> /dev/null; then
        bun "$INSTALL_PREFIX/src/daemon/listen.ts" >> "$LOG_DIR/daemon.log" 2>&1
      else
        node "$INSTALL_PREFIX/src/daemon/listen.js" >> "$LOG_DIR/daemon.log" 2>&1
      fi
      
      EXIT_CODE=$?
      if [[ $EXIT_CODE -ne 0 ]]; then
        echo "[$(date +'%Y-%m-%d %H:%M:%S')] Listening loop exited with code $EXIT_CODE. Restarting in 5s..." >> "$LOG_DIR/daemon.log"
        sleep 5
      fi
    done
  ) &
  LISTEN_PID=$!
  echo $LISTEN_PID > "$LOG_DIR/.listen.pid"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] Listening loop started (PID: $LISTEN_PID)" >> "$LOG_DIR/daemon.log"

  DAEMON_PID=$LISTEN_PID
  echo $DAEMON_PID > "$PID_FILE"

  echo -e "${GREEN}✓ resendld started (PID: $DAEMON_PID)${NC}"
  echo "  Daemon logs: $LOG_DIR/daemon.log"
  echo "  Convex logs: $LOG_DIR/convex.log"
  echo "  Web logs:    $LOG_DIR/web.log"
  echo "  Web UI:      https://resendld.localhost"
}

# Stop the daemon
stop_daemon() {
  if ! is_running; then
    echo -e "${YELLOW}resendld is not running${NC}"
    return 0
  fi

  DAEMON_PID=$(cat "$PID_FILE")
  echo "Stopping resendld (PID: $DAEMON_PID)..."
  
  kill $DAEMON_PID 2>/dev/null || true
  
  # Stop child processes
  [[ -f "$LOG_DIR/.convex.pid" ]] && kill $(cat "$LOG_DIR/.convex.pid") 2>/dev/null || true
  [[ -f "$LOG_DIR/.web.pid" ]] && kill $(cat "$LOG_DIR/.web.pid") 2>/dev/null || true
  
  rm -f "$PID_FILE"
  
  echo -e "${GREEN}✓ resendld stopped${NC}"
}

# Restart the daemon
restart_daemon() {
  stop_daemon
  sleep 1
  start_daemon
}

# Show daemon status
status_daemon() {
  if is_running; then
    PID=$(cat "$PID_FILE")
    echo -e "${GREEN}✓ resendld is running (PID: $PID)${NC}"
    echo ""
    echo "Configuration: $CONFIG_DIR/boxes.json"
    echo "Mail storage:  $MAIL_DIR"
    echo "Logs:          $LOG_DIR"
    echo "Web UI:        https://resendld.localhost"
  else
    echo -e "${RED}✗ resendld is not running${NC}"
  fi
}

# Show daemon logs
show_logs() {
  echo "=== Daemon Logs ==="
  tail -n 50 "$LOG_DIR/daemon.log" 2>/dev/null || echo "(no logs yet)"
  echo ""
  echo "=== Convex Logs ==="
  tail -n 20 "$LOG_DIR/convex.log" 2>/dev/null || echo "(no logs yet)"
  echo ""
  echo "=== Web Logs ==="
  tail -n 20 "$LOG_DIR/web.log" 2>/dev/null || echo "(no logs yet)"
}

# Box management commands
box_add() {
  local email=$1
  init_config
  
  # Use jq to add new box to boxes.json
  if command -v jq &> /dev/null; then
    jq ".boxes += [{\"email\": \"$email\", \"isActive\": true, \"lastSync\": null}]" \
      "$CONFIG_DIR/boxes.json" > "$CONFIG_DIR/boxes.json.tmp" && \
      mv "$CONFIG_DIR/boxes.json.tmp" "$CONFIG_DIR/boxes.json"
    echo -e "${GREEN}✓ Added box: $email${NC}"
  else
    echo -e "${RED}✗ jq required for box management${NC}"
    return 1
  fi
}

box_list() {
  init_config
  if command -v jq &> /dev/null; then
    echo "Configured email boxes:"
    jq -r '.boxes[] | "\(.email) (\(.isActive | if . then "active" else "inactive" end))"' \
      "$CONFIG_DIR/boxes.json"
  else
    echo -e "${RED}✗ jq required for box management${NC}"
    return 1
  fi
}

box_remove() {
  local email=$1
  init_config
  
  if command -v jq &> /dev/null; then
    jq ".boxes |= map(select(.email != \"$email\"))" \
      "$CONFIG_DIR/boxes.json" > "$CONFIG_DIR/boxes.json.tmp" && \
      mv "$CONFIG_DIR/boxes.json.tmp" "$CONFIG_DIR/boxes.json"
    echo -e "${GREEN}✓ Removed box: $email${NC}"
  else
    echo -e "${RED}✗ jq required for box management${NC}"
    return 1
  fi
}

# Main entry point
main() {
  case "${1:-status}" in
    start)
      start_daemon
      ;;
    stop)
      stop_daemon
      ;;
    restart)
      restart_daemon
      ;;
    status)
      status_daemon
      ;;
    logs)
      show_logs
      ;;
    box)
      case "${2:-}" in
        add)
          box_add "${3:?Email address required}"
          ;;
        list)
          box_list
          ;;
        remove)
          box_remove "${3:?Email address required}"
          ;;
        *)
          echo "Usage: resendld box [add|list|remove] [email]"
          return 1
          ;;
      esac
      ;;
    *)
      echo "resendld - Resend Email Listening Daemon"
      echo ""
      echo "Usage: resendld [COMMAND]"
      echo ""
      echo "Commands:"
      echo "  start          Start the daemon"
      echo "  stop           Stop the daemon"
      echo "  restart        Restart the daemon"
      echo "  status         Show daemon status"
      echo "  logs           Show recent logs"
      echo "  box add EMAIL  Add email box to listen to"
      echo "  box list       List configured boxes"
      echo "  box remove EMAIL  Remove email box"
      return 1
      ;;
  esac
}

main "$@"
