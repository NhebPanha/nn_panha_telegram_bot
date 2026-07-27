# TeleFlow Pro — Telegram Bot Management Dashboard

A self-hosted web dashboard for managing a Telegram bot: broadcast messages to
groups and channels, schedule recurring/one-time messages, chat inside groups
Telegram-style (view members, read history, reply, delete), and auto-moderate
links & stickers.

Built with **Nuxt 4 + Vue 3 + Pinia + Tailwind CSS**, running on **Nitro /
Cloudflare Workers** with **Cloudflare KV** for storage (local dev uses JSON
files under `data/`).

---

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Live stats, recent activity, quick bot status. |
| **Bot Settings** | Add/verify a bot token (stored **encrypted**), view permissions, enable/disable. |
| **Groups** | Register groups/channels/supergroups as broadcast targets. Bulk import, search, filter, auto-discovery when the bot is added to a chat. |
| **Chat** | Telegram-style view per group: member list (admins + everyone the bot has seen), message history, **reply**, and **delete message**. |
| **Schedules** | Daily / weekly / monthly / one-time / cron broadcasts, per-timezone, with **per-group targeting** (send to all groups or only selected ones). |
| **Moderation** | Auto-delete links and/or stickers; posts a tagged notice. Manual `@bot delete` reply-command (admins only) to remove any message. |
| **Logs** | Every send/moderation action recorded with status and error detail. |

### Telegram limitations to know
- Bots **cannot list every member** of a group — the member panel shows admins
  (fetched live) plus everyone the bot has *seen post a message*. The true total
  count is shown separately (e.g. `2 / 11`).
- Bots **cannot read message history** from before they joined / before the
  webhook was active. History is captured going forward only.
- Deleting another user's message requires the bot to be an **admin with the
  "Delete messages" permission**; it can always delete its own messages.

---

## Tech stack

- **Frontend:** Nuxt 4, Vue 3 `<script setup>`, Pinia stores, Tailwind CSS, lucide-vue-next icons
- **Backend:** Nitro server routes (`server/api/**`), server middleware for auth
- **Storage:** Cloudflare KV in production (`DATA` binding) / `data/*.json` in dev
- **Scheduling:** Cloudflare cron trigger (`* * * * *`) → Nitro `broadcast` task
- **Telegram:** webhook-based updates (`/api/telegram/webhook`)

---

## Getting started (local)

Requirements: Node.js 20+.

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file (see below)

# 3. Run the dev server
npm run dev
```

The app runs at http://localhost:3000. In dev, data is read/written to the JSON
files in `data/` (no Cloudflare account needed).

### Environment variables (`.env`)

```dotenv
# 32-char key used to encrypt the stored bot token — CHANGE THIS
ENCRYPTION_KEY=your-32-character-secret-key-here!

# Shared secret Telegram must send back on webhook calls
WEBHOOK_SECRET=some-long-random-string

# Optional: auto-seed a bot token / default group on startup
TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token
TELEGRAM_GROUP_CHAT_ID=-1001234567890

# Public HTTPS URL of the deployment (used to register the webhook)
PUBLIC_URL=https://your-worker.workers.dev
```

> On Cloudflare, these map to `NUXT_*` runtime config (e.g.
> `NUXT_ENCRYPTION_KEY`, `NUXT_WEBHOOK_SECRET`, `NUXT_PUBLIC_URL`).

### Logging in

Authentication is session-based. A default `admin` user ships in
`data/users.json`. Set/replace it by editing that file with a SHA-256 password
hash, or log in with the existing credentials for your instance.

---

## Connecting the bot

1. Create a bot with **@BotFather** and copy its token.
2. In **Bot Settings**, paste the token and verify it.
3. In **BotFather → `/setprivacy` → Disable** so the bot can see all group
   messages (required for member discovery, chat history, and moderation).
   Then **remove and re-add** the bot to the group for it to take effect.
4. Add the bot to your group/channel as an **admin** (needed to delete messages).
5. Register the webhook from the **Moderation** tab (requires a public HTTPS URL
   — do this after deploying; Telegram cannot reach `localhost`).

---

## Deploying to Cloudflare Workers

```bash
# 1. Log in
npx wrangler login

# 2. Create the KV namespace and paste its id into wrangler.toml [[kv_namespaces]]
npx wrangler kv namespace create DATA

# 3. Set secrets (never commit these)
npx wrangler secret put NUXT_ENCRYPTION_KEY
npx wrangler secret put NUXT_WEBHOOK_SECRET
npx wrangler secret put NUXT_TELEGRAM_BOT_TOKEN   # optional

# 4. Set the public URL in wrangler.toml [vars]
#    NUXT_PUBLIC_URL = "https://<your-worker>.workers.dev"

# 5. Build & deploy
npm run build
npm run deploy
```

Notes:
- `compatibility_flags = ["nodejs_compat"]` is required (already set in
  `wrangler.toml`).
- The cron trigger runs the broadcast task **every minute**; schedules use a
  grace window + `lastExecutedAt` so a late/duplicate tick won't double-send.
- Do **not** rely on the Cloudflare dashboard env vars — Nitro's deploy config
  overwrites them. Use `wrangler secret` / `[vars]` instead.

---

## Project structure

```
app/
  components/     UI: GroupManager, GroupChat, ScheduleManager, ModerationManager, ...
  stores/         Pinia stores (bot, groups, chat, schedules, moderation, logs, auth)
  pages/          index.vue (tabbed panel) + login.vue
  middleware/     auth.global.ts
server/
  api/            REST endpoints (auth, bot, groups, schedules, messages, telegram, ...)
    groups/[id]/  members, messages (get/post), messages/[msgId] (delete)
  tasks/          broadcast.ts (cron entry point)
  utils/          db, telegram, scheduler, moderation, crypto, session
  middleware/     auth.ts (protects /api/* except auth + telegram webhook)
data/             dev JSON store: bot, groups, schedules, logs, moderation, users, members, messages
```

---

## npm scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Nuxt dev server |
| `npm run build` | Build for Cloudflare Workers (`.output/`) |
| `npm run preview` | Preview the production build locally |
| `npm run deploy` | Deploy with Wrangler |

---

## Security notes

- Bot tokens are encrypted at rest with `ENCRYPTION_KEY` — use a strong 32-char
  value and keep it secret.
- The webhook endpoint is authenticated with `WEBHOOK_SECRET`; Telegram must
  send it back via the `x-telegram-bot-api-secret-token` header.
- All `/api/*` routes require a session, except `/api/auth/*` and the Telegram
  webhook.
