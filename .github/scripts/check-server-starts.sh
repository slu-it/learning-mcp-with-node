#!/usr/bin/env bash
# Usage: check-server-starts.sh <npm-script> <startup-log-pattern> [stdio|http]
NPM_SCRIPT="$1"
PATTERN="$2"
MODE="${3:-http}"

LOG=$(mktemp)

if [ "$MODE" = "stdio" ]; then
  # Keep stdin open — closing it (e.g. </dev/null) causes the STDIO MCP server to exit immediately.
  # Capture stderr only; stdout carries MCP protocol messages and must not be mixed in.
  npm run "$NPM_SCRIPT" 2>"$LOG" < <(sleep infinity) &
else
  npm run "$NPM_SCRIPT" </dev/null >"$LOG" 2>&1 &
fi

PID=$!
for i in $(seq 1 50); do
  sleep 0.2
  if ! kill -0 $PID 2>/dev/null; then
    echo "$NPM_SCRIPT exited unexpectedly:"
    cat "$LOG"
    exit 1
  fi
  if grep -q "$PATTERN" "$LOG"; then
    echo "$NPM_SCRIPT started OK"
    kill $PID
    exit 0
  fi
done
echo "$NPM_SCRIPT did not start within 10s:"
cat "$LOG"
kill $PID 2>/dev/null
exit 1
