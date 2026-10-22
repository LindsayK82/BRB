# BRB live-chat test build

Open via a local HTTP server, not `file://`. In this folder run `python -m http.server 8000` and visit http://localhost:8000.

Uses BRB Supabase project and its **public publishable key**. Do not put secret/service role keys in frontend files.

## Test
1. Log in with test account A and select an available username (3–30 letters/numbers/underscores).
2. In another private/incognito browser session log in with test account B and choose another username.
3. Open the same room and send messages in both sessions. Confirm messages appear and usernames show in the sidebar.
4. Visit Settings to see your private stars; email is not in public profile.

## Not production-ready
Moderation bans, appeal reports, automatic retention cleanup, robust spam prevention, permanent account deletion, avatar uploads, and secure production Realtime presence authorization are not yet implemented. Historical messages are filtered by configured ages in UI, but not yet deleted from database. Sound toggle has no audio effects. Password recovery may require configuring Supabase Auth redirect URLs.

## Admin dashboard test build (Oct 22, 2026)

This package contains only the four files needed to update your existing BRB VS Code folder. It does not include Git internals. Back up the project or make a Git commit before replacing files.

- Log in as `this_hoe_dumb` to display the Admin navigation entry. Sign out and in again if an older session doesn't yet have the role.
- The administrator can view user star totals, moderation history, and pending appeals.
- In a room, the administrator sees a **Remove comment** button on other members' messages. Removal asks for a reason and confirmation; the database RPC handles the deduction.
- The regular account can view its private moderation report in Settings and submit an appeal for an eligible deduction.
- Test with the existing two accounts, using separate browsers or an incognito window.
- Email notifications, periodic cleanup, automated retention, final appeal evidence lifecycle, and full authorization test coverage are NOT implemented. Do not publish this as production-ready.
- Supabase's security advisor still warns about executable SECURITY DEFINER RPCs and disabled leaked-password protection. The RPCs check the admin identity server-side, but the complete negative-permission testing remains to be done.

To serve locally, from the project folder run `python -m http.server 8000` and open http://localhost:8000. Use Ctrl+C to stop.

### Moderation email delivery (October 22 build)
After an administrator removes a comment or resolves an appeal, the website invokes the deployed `brb-send-moderation-emails` Supabase Edge Function using the administrator's logged-in session. The Edge Function, not the browser, accesses Resend's private API key. Delivery errors leave an item in the private outbox for retry. This is **admin-action-triggered delivery**, not yet an independent scheduled retry job; if the call fails or the browser closes, queued emails will remain until another admin action or scheduled dispatcher is added. Check the Resend delivery dashboard and Supabase Edge Function logs during testing.

DO NOT put RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY into these files.


## Member reporting (new)
Every other member's chat message has a Report control. A single report per member per comment is accepted; reports go into the private Admin queue. The admin can dismiss, record a note, or remove the comment and deduct one star. Reporter history displays recent counts; no report automatically triggers moderation.
IMPORTANT: report rows persist when a comment is removed to preserve the review history; do not publish these records.


## Discreet message menu update
Other members' chat messages now have a small ⋯ options control, with **Hide comment** and **Report comment**. Admins also see **Remove comment (admin)**.

Hide comment is **only for the current member in this browser** (stored in localStorage per Supabase user ID), and does not delete the message, notify anyone, create a report, or deduct stars. Hidden messages remain hidden on room reloads in the same browser. They may still appear in a different browser/device. To undo hiding in this build, clear the `brb-hidden-messages:<your-user-id>` localStorage entry. Later we can add a dedicated hidden-message manager with cross-device persistence.


## Welcome Email v1 (October 22, 2026)
A Supabase auth.users trigger queues one email when email_confirmed_at first becomes non-null. The brb-send-welcome Edge Function verifies the signed-in user, then sends the email through Resend with a per-user idempotency key. The web app calls this on each verified sign-in, but previously sent welcome emails will not re-send. Note: delivery starts when the member has a verified session/visits the site, not at the precise moment of clicking a verification link unless that link creates a session and returns to BRB. Tested database trigger installation and function deployment, but a fresh-account email delivery test remains necessary. Existing verified accounts are not backfilled.
