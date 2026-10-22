BRB — Automatic Chat Cleanup (October 22, 2026)

Replace index.html, app.js, styles.css in VS Code. Keep a backup first.

Database job brb-clean-expired-chat is ACTIVE and executes every five minutes.
Life: rolling 24-hour retention; Music/Books/Movies: rolling seven days.
The timer on Life shows when the oldest loaded message expires, NOT a fixed daily reset.
Cleanup excludes messages with pending reports. Archived monthly book clubs must live in a separate table, not the transient chat_messages table.
The site continues to filter old messages when loading rooms; scheduled deletion removes them from storage.
Check localhost rendering and confirm the timer on Life, and seven-day notices on other rooms.
