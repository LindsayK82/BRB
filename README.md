# BRB — Rules acknowledgment (staged v1)

The web files keep the existing BRB pages and add the rules view and Cloudflare Turnstile client integration.

## IMPORTANT: setup required before activation
1. Create a Cloudflare Turnstile widget for your website domain (and localhost for local tests). Copy the PUBLIC site key into `BRB_TURNSTILE_SITE_KEY` near the top of `app.js`.
2. In Supabase Project > Edge Functions > Secrets set `BRB_TURNSTILE_SECRET` to the PRIVATE Turnstile secret. Never put that secret in HTML, CSS, or JS.
3. Update these four files in VS Code. Test the rules acceptance flow first in a staging environment.
4. Only after site and secret keys are configured, turn on rules enforcement in database by setting `brb_private.rules_configuration.enforcement_enabled = true` in Supabase SQL Editor. This is intentionally OFF now to avoid locking out existing chat users.
5. Existing users also need to acknowledge version 1 after rollout.

## Verification checklist
- CAPTCHA without checking agreement fails.
- Agreement without CAPTCHA fails.
- Valid verification saves record and permits posting.
- Another browser without the acknowledgment cannot post.
- Reloading does not prompt again once accepted.
- Supabase does not accept direct chat INSERT before acknowledgment once enforcement is enabled.

Current status: backend tables, RPCs, and Edge Function deployed; enforcement remains disabled pending Turnstile credentials and end-to-end testing.
