# BRB — Turnstile Connected (staged)

Your public Cloudflare Turnstile SITE KEY has been configured in app.js. The SECRET is not included in these files; it must stay in Supabase as BRB_TURNSTILE_SECRET.

## Testing
1. Back up your current four files in VS Code. Replace index.html, app.js, styles.css with the copies in this ZIP (README is documentation).
2. Load BRB from the hostname registered with Cloudflare Turnstile, not a file:// URL. Refresh with Ctrl+Shift+R.
3. Log in as a verified test member. You should see the Community Rules agreement view.
4. Check the rules box; complete the real Turnstile challenge; click Agree & enter chat.
5. Sign out and log in again. A recorded acknowledgment should bypass the rules view.
6. Test another unacknowledged account.

Database enforcement is intentionally OFF until end-to-end tests pass. The UI shows the rules gate to test it, but this is NOT a security guarantee until enforcement is switched ON in Supabase.

If the Turnstile widget displays an invalid-sitekey or domain error, open app.js and verify the exact public site key and permitted hostnames from the Cloudflare dashboard. Do not paste the secret into any web file.
