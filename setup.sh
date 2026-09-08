#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Idreamofthought/portus-server"
WORK_DIR="$(pwd)"
APP_DIR="$WORK_DIR/portus-server"

echo
echo "=== Portus Server Setup ==="
echo "Repository: $REPO_URL"
echo "Working directory: $WORK_DIR"
echo

# Step 1 - Clone the repo if not present
if [[ ! -d "$APP_DIR" ]]; then
  echo "Cloning repository..."
  git clone "$REPO_URL"
else
  echo "Repository already exists at $APP_DIR"
fi

# Step 2 - Navigate to project directory
cd "$APP_DIR"

# Step 3 - Copy example env to real env (overwrite if exists)
if [[ -f ".env" ]]; then
  echo "Removing existing .env"
  rm -f ".env"
fi

if [[ -f ".env.example" ]]; then
  echo "Copying .env.example to .env"
  cp ".env.example" ".env"
else
  echo "Warning: .env.example not found in the repository root"
fi

# Step 4 - Install dependencies
echo "Installing dependencies..."
npm install

# Step 5 - Start the server
echo "Starting server..."
if npm start; then
  echo "Server started with npm start"
else
  echo "npm start not found, trying node server.js"
  node server.js &
fi

# Step 6 - Open browser automatically (optional)
URL="http://localhost:8080"
echo "Opening $URL ..."
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
elif command -v open >/dev/null 2>&1; then
  open "$URL"
else
  echo "Please open your browser and go to $URL"
fi

echo
echo "=== Setup Complete ==="
echo "Portus should now be running at $URL"
echo "Edit .env with your real credentials before production deployment."
