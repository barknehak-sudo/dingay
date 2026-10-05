# Run the verifier on an Android phone (instead of the Mac)

Telebirr receipts only open from Ethiopian internet, so the verifier has to run on a device in Ethiopia.
An old Android phone (Android 7 or newer), left plugged in on Wi-Fi, does the job.

## 1. Make the setup file (on the Mac, once per update)

```bash
node verifier/build-phone.mjs
```

This writes `verifier/dingay-phone-setup.sh`. Send that one file to the phone (Telegram "Saved Messages" works).
It doesn't contain the password.

## 2. On the phone

1. Install **F-Droid** from f-droid.org, then from F-Droid install **Termux** and **Termux:Boot**.
   (The Play Store version of Termux is outdated — don't use it.)
2. Open **Termux:Boot** once (that switches on start-at-boot), then open **Termux**.
3. In Termux, allow file access and run the setup:
   ```bash
   termux-setup-storage
   bash ~/storage/downloads/Telegram/dingay-phone-setup.sh
   ```
   (Adjust the path to wherever the file was saved — `ls ~/storage/downloads` shows it.)
4. Type the /office admin password when asked. It's stored only on the phone (`~/.dingay-env`).

## 3. Keep it alive

- Settings → Apps → Termux → Battery → **Unrestricted** (or "Don't optimise"). Same for Termux:Boot.
- Keep it charging and on Wi-Fi. Leave the Termux notification ("wake lock held") alone.

## Check / update

- Log: `tail -f ~/dingay/verifier.log` in Termux.
- Update: build a new setup file on the Mac and run it again on the phone — same steps, password is kept.
- Stop the Mac one when the phone is running: `launchctl bootout gui/$(id -u)/com.dingay.verifier` (two verifiers at once are harmless, just redundant).
