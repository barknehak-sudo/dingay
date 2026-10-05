// Builds verifier/dingay-phone-setup.sh — ONE file that installs the verifier on an Android phone (Termux).
// Run on the Mac:  node verifier/build-phone.mjs
// Then send dingay-phone-setup.sh to the phone (Telegram "Saved Messages", email, USB) and follow PHONE.md.
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';

const here = new URL('.', import.meta.url);
const lib = readFileSync(new URL('../api/_lib.js', here), 'utf8');
const verify = readFileSync(new URL('verify.mjs', here), 'utf8').replace("'../api/_lib.js'", "'./_lib.js'");
const fence = (s) => { if (s.includes('DINGAY_EOF')) throw new Error('file contains the heredoc marker'); return s; };

const sh = `#!/data/data/com.termux/files/usr/bin/bash
# DINGUY verifier — phone setup (Termux). Safe to run again to update.
set -e
DIR="$HOME/dingay"
mkdir -p "$DIR" "$HOME/.termux/boot"

echo "Installing Node.js (first time takes a few minutes)…"
pkg update -y >/dev/null 2>&1 || true
command -v node >/dev/null || pkg install -y nodejs-lts

cat > "$DIR/_lib.js" <<'DINGAY_EOF'
${fence(lib)}
DINGAY_EOF
cat > "$DIR/verify.mjs" <<'DINGAY_EOF'
${fence(verify)}
DINGAY_EOF
echo '{"type":"module"}' > "$DIR/package.json"

if [ ! -s "$HOME/.dingay-env" ]; then
  printf "DINGUY admin password (same as /office): "
  read -rs PW; echo
  umask 077
  printf "export DINGUY_ADMIN_PASSWORD=%q\\nexport DINGUY_SITE=https://dinguy.xyz\\n" "$PW" > "$HOME/.dingay-env"
fi

# Runs forever, restarts if it ever stops, keeps the phone from sleeping it.
cat > "$DIR/run.sh" <<'DINGAY_EOF'
#!/data/data/com.termux/files/usr/bin/bash
. "$HOME/.dingay-env"
termux-wake-lock 2>/dev/null || true
cd "$HOME/dingay"
while true; do
  node verify.mjs >> "$HOME/dingay/verifier.log" 2>&1
  sleep 10
done
DINGAY_EOF
chmod +x "$DIR/run.sh"

# Termux:Boot starts it when the phone turns on.
cat > "$HOME/.termux/boot/dingay" <<'DINGAY_EOF'
#!/data/data/com.termux/files/usr/bin/bash
nohup "$HOME/dingay/run.sh" >/dev/null 2>&1 &
DINGAY_EOF
chmod +x "$HOME/.termux/boot/dingay"

pkill -f "dingay/run.sh" 2>/dev/null || true
pkill -f "node verify.mjs" 2>/dev/null || true
nohup "$DIR/run.sh" >/dev/null 2>&1 &
sleep 4
echo
echo "✓ Verifier is running. Last lines of its log:"
tail -n 5 "$DIR/verifier.log" 2>/dev/null || true
echo
echo "See the log any time:  tail -f ~/dingay/verifier.log"
`;
const out = new URL('dingay-phone-setup.sh', here);
writeFileSync(out, sh);
chmodSync(out, 0o755);
console.log('Wrote', out.pathname);
