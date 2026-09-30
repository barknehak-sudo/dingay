#!/bin/zsh
# Installs the DINGAY verifier as a background login agent on this Mac.
# Before running: store the admin password in Keychain (you'll be prompted, it isn't echoed):
#   security add-generic-password -a "$USER" -s dingay-admin -w
set -euo pipefail
SRC="${0:A:h}"
DEST="$HOME/Library/Application Support/DingayVerifier"
PLIST="$HOME/Library/LaunchAgents/com.dingay.verifier.plist"
LOG="$HOME/Library/Logs/dingay-verifier.log"
NODE="$(command -v node)"

security find-generic-password -s dingay-admin >/dev/null 2>&1 || { echo "Add the Keychain item first: security add-generic-password -a \"\$USER\" -s dingay-admin -w"; exit 1; }

# Copy out of ~/Downloads (macOS blocks background agents from reading it).
mkdir -p "$DEST"
cp "$SRC/../api/_lib.js" "$DEST/_lib.js"
sed "s#'../api/_lib.js'#'./_lib.js'#" "$SRC/verify.mjs" > "$DEST/verify.mjs"
echo '{"type":"module"}' > "$DEST/package.json"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dingay.verifier</string>
  <key>ProgramArguments</key><array><string>$NODE</string><string>$DEST/verify.mjs</string></array>
  <key>WorkingDirectory</key><string>$DEST</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>60</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/com.dingay.verifier" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed. Log: $LOG"
