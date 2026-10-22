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
