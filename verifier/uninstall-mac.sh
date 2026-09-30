#!/bin/zsh
# Stops and removes the DINGAY verifier login agent (leaves the Keychain item).
launchctl bootout "gui/$(id -u)/com.dingay.verifier" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.dingay.verifier.plist"
rm -rf "$HOME/Library/Application Support/DingayVerifier"
echo "Removed."
