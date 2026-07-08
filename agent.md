# ⚡ TeleFlow — Telegram Bot Message Scheduler & Dashboard

**TeleFlow** is a modern, responsive self-hosted web application and cron scheduler for managing automated broadcasts to Telegram groups, channels, and chats. Built with **Nuxt 4**, **Tailwind CSS**, and **Pinia**, it provides a slick administrative panel to manage Telegram bots, schedule daily broadcasts, track group targets, and view execution logs.

---

## 🚀 Key Features

- 📊 **Administrative Dashboard Stats**: Real-time summary of active schedules, destination groups, total logs, and message success rates.
- 🔑 **Secure Bot Token Storage**: Sensitive Telegram Bot API tokens are stored fully encrypted on disk using AES-256-CBC encryption.
- 🤖 **Connection Verification & Testing**: Verify bot tokens directly against the official Telegram API and send instant test messages to verified chats.
- 👥 **Group & Channel Management**: Dynamic registry to add, configure, toggle, or delete target Telegram chats/channels using chat IDs.
- 📅 **Daily Message Scheduling**: Schedule recurring daily messages at specific local times (HH:MM format) with support for raw HTML formatting (e.g. `<b>bold</b>`, `<i>italic</i>`).
- ⏱️ **Cron-Based Nitro Engine**: A lightweight scheduler plugin powered by `node-cron` checks database schedules every minute to execute tasks.
- 🪵 **Execution Audit Logs**: Comprehensive history tracking target groups, scheduled times, sent text, delivery statuses (SUCCESS / FAILED), and descriptive error logs if a message fails to send.
- ⚙️ **Automatic Environment Syncing**: Bootstraps automatically using environment variables (`TELEGRAM_BOT_TOKEN` & `TELEGRAM_GROUP_CHAT_ID`) to populate settings and seeds default schedules (Morning, Lunch, Evening alerts).
- ⚡ **Rate-Limiting Protection**: sequential timeouts (500ms delay between dispatches) to ensure compliance with Telegram API rate limits.

---

## 🛠️ Technology Stack

- **Frontend & Backend Framework**: [Nuxt 4](https://nuxt.com/) (using Vue 3, Nitro engine, and Nuxt 4 directory structure)
- **State Management**: [Pinia](https://pinia.vuejs.org/) for clean modular stores (`bot`, `dashboard`, `groups`, `logs`, `schedules`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for fluid, dark-mode-first glassmorphic user interface design
- **Icons**: [Lucide Vue Next](https://lucide.dev/) for crisp, uniform iconography
- **Scheduling**: [Node-cron](https://www.npmjs.com/package/node-cron) running as an in-memory background worker
- **Database**: Local JSON files (`data/*.json`) utilizing atomic file writes to ensure data integrity without database server overhead

---

## 📂 Project Structure

```text
nn_bot/
├── app/                  # Nuxt 4 Frontend App
│   ├── assets/           # CSS stylesheets and global layouts
│   ├── components/       # Vue dashboard components
│   │   ├── BotSettings.vue      # Bot token configs and testing utilities
│   │   ├── DashboardStats.vue   # Summary widgets showing stats/metrics
│   │   ├── GroupManager.vue     # Group registration table and toggles
│   │   ├── LogViewer.vue        # System log viewer with statuses/errors
│   │   ├── ScheduleManager.vue  # Schedules list, additions, and updates
│   │   └── ToastList.vue        # Global notification feedback toasts
│   ├── composables/      # Shared custom composables
│   ├── layouts/          # Base template structure (default header/footer)
│   ├── pages/            # Page routing (index dashboard router)
│   └── stores/           # Pinia reactive state stores
├── data/                 # Local JSON Database directory
│   ├── bot.json          # Bot credential information (encrypted token)
│   ├── groups.json       # Registered group list
│   ├── logs.json         # Dispatch history logs
│   └── schedules.json    # Cron daily schedule routines
├── server/               # Nuxt 4 Backend API
│   ├── api/              # API endpoints (/bot, /groups, /schedules, /logs, /dashboard)
│   ├── plugins/          # Nitro server plugins (node-cron initializer)
│   │   └── cron.ts       # Active cron dispatcher and environment sync
│   └── utils/            # Server utilities
│       ├── crypto.ts     # AES-256-CBC encrypt/decrypt bot tokens
│       ├── db.ts         # JSON file database operations wrapper
│       └── telegram.ts   # Telegram sendMessage / getMe API integration
├── .env                  # Environment configurations and initial boot keys
├── nuxt.config.ts        # Nuxt config (Nuxt 4 directory scheme enabled)
└── package.json          # Project configurations, commands, and dependencies
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js (v18.x or later)** installed.

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or copy `.env.example` if available) and add your keys:

```ini
# Encryption key used for encrypting the bot token on disk (32 characters recommended)
ENCRYPTION_KEY="teleflow-ultra-secure-secret-encryption-key-32b"
PORT=3000

# Optional: Seed initial credentials on first run
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_GROUP_CHAT_ID="-100xxxxxxxxx"
```

### 3. Install Dependencies
Install all project requirements:

```bash
# Using npm
npm install

# Using pnpm
pnpm install
```

### 4. Run the Development Server
Launch the application locally on `http://localhost:3000`:

```bash
npm run dev
```

### 5. Build and Deploy for Production
To package the app for production deployment:

```bash
# Build the standalone production folder
npm run build

# Start the node server
node .output/server/index.mjs
```

---

## 🔒 Security & Database Details

- **Cryptographic Encryption**: Bot tokens are encrypted on disk inside `data/bot.json`. When saving a token, TeleFlow generates a random Initial Vector (IV) and encrypts the token using `aes-256-cbc` based on the hashed `ENCRYPTION_KEY` configured in `.env`.
- **Atomic Operations**: All database write operations inside `server/utils/db.ts` utilize atomic temp-write-and-rename strategies to avoid data corruption under concurrent write access.
- **SetNull & Cascades**: Deleting a schedule safely updates related message logs (`scheduleId = null`), and deleting a group cleanses all dependent logs to optimize storage.
