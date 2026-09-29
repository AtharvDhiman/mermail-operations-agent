#!/usr/bin/env bash

# Mermail Agent Escrow & Arbitration Desk — Bash Entrypoint
# Works across Linux, macOS, WSL, and Git Bash.

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="node"
elif command -v node.exe >/dev/null 2>&1; then
  NODE_BIN="node.exe"
elif [ -f "/c/Program Files/nodejs/node.exe" ]; then
  NODE_BIN="/c/Program Files/nodejs/node.exe"
else
  NODE_BIN="node"
fi

"$NODE_BIN" "$DIR/bin/escrow-cli.js" "$@"
