import { db, ModerationSettings } from '../utils/db'
import { decryptToken } from '../utils/crypto'
import {
  getTelegramUpdates,
  deleteMessage,
  deleteTelegramWebhook,
  TelegramIncomingMessage,
  TelegramUpdate
} from '../utils/telegram'

// Detect whether a message contains a link/URL.
function hasLink(msg: TelegramIncomingMessage): boolean {
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])]
  if (entities.some(e => e.type === 'url' || e.type === 'text_link')) {
    return true
  }
  // Fallback: scan raw text/caption for common URL shapes
  const text = `${msg.text || ''} ${msg.caption || ''}`
  return /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(com|net|org|io|me|xyz|info|co|link)\b)/i.test(text)
}

function isSticker(msg: TelegramIncomingMessage): boolean {
  return !!msg.sticker
}

// Auto-register a group/channel the bot belongs to so it becomes a selectable
// broadcast target with the correct numeric chat ID.
async function autoRegisterChat(chat: {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
}) {
  if (chat.type === 'private') return
  const chatId = String(chat.id)
  const existing = await db.getGroupByChatId(chatId)
  if (existing) return

  const name = chat.title || (chat.username ? `@${chat.username}` : `Chat ${chatId}`)
  await db.createGroup(name, chatId, chat.type, true)
  console.log(`[Discovery] Auto-registered ${chat.type} "${name}" (${chatId})`)
}

async function moderateMessage(
  token: string,
  botUserId: number,
  msg: TelegramIncomingMessage,
  settings: ModerationSettings
) {
  if (!settings.enabled) return
  // Never moderate the bot's own messages (e.g. scheduled broadcasts)
  if (msg.from && msg.from.id === botUserId) return
  if (msg.chat.type === 'private') return

  let reason = ''
  if (settings.deleteStickers && isSticker(msg)) {
    reason = 'sticker'
  } else if (settings.deleteLinks && hasLink(msg)) {
    reason = 'link'
  }
  if (!reason) return

  try {
    await deleteMessage(token, String(msg.chat.id), msg.message_id)

    const who = msg.from?.username
      ? `@${msg.from.username}`
      : (msg.from?.first_name || 'user')
    const chatTitle = msg.chat.title || String(msg.chat.id)
    const group = await db.getGroupByChatId(String(msg.chat.id))

    await db.createLog(
      group ? group.id : null,
      chatTitle,
      null,
      `🧹 Auto-deleted ${reason} from ${who}`,
      'SUCCESS',
      null,
      null
    )
    console.log(`[Moderation] Deleted ${reason} in "${chatTitle}" from ${who}`)
  } catch (err: any) {
    console.warn(`[Moderation] Failed to delete ${reason} in chat ${msg.chat.id}: ${err.message}`)
  }
}

async function handleUpdate(token: string, botUserId: number, update: TelegramUpdate, settings: ModerationSettings) {
  // Bot was added to / changed status in a chat -> register it
  if (update.my_chat_member) {
    const status = update.my_chat_member.new_chat_member?.status
    if (status && status !== 'left' && status !== 'kicked') {
      await autoRegisterChat(update.my_chat_member.chat)
    }
    return
  }

  const msg =
    update.message || update.channel_post || update.edited_message || update.edited_channel_post
  if (!msg) return

  // Discover the source chat, then moderate the message
  await autoRegisterChat(msg.chat)
  await moderateMessage(token, botUserId, msg, settings)
}

export default defineNitroPlugin((nitroApp) => {
  console.log('[Nitro Plugin] Telegram updates watcher initialized (discovery + moderation)!')

  let offset = 0
  let stopped = false
  let warnedConflict = false
  let webhookCleared = false

  const schedule = (ms: number) => {
    if (!stopped) setTimeout(poll, ms)
  }

  const poll = async () => {
    if (stopped) return

    const bot = await db.getBot()
    if (!bot || !bot.active) {
      return schedule(3000)
    }

    let token = ''
    try {
      token = decryptToken(bot.token)
    } catch {
      return schedule(5000)
    }

    let settings: ModerationSettings
    try {
      settings = await db.getModerationSettings()
    } catch {
      settings = { enabled: false, deleteLinks: false, deleteStickers: false }
    }

    const botUserId = parseInt(token.split(':')[0], 10)

    // Clear any stale webhook once so getUpdates polling is permitted
    if (!webhookCleared) {
      await deleteTelegramWebhook(token)
      webhookCleared = true
    }

    try {
      const updates = await getTelegramUpdates(token, offset, 25)
      warnedConflict = false
      for (const u of updates) {
        offset = u.update_id + 1
        await handleUpdate(token, botUserId, u, settings)
      }
      schedule(0)
    } catch (err: any) {
      // 409 = a webhook is set (getUpdates not allowed). Warn once.
      if (/conflict/i.test(err.message) && !warnedConflict) {
        warnedConflict = true
        console.warn('[Watcher] getUpdates conflict — remove any Telegram webhook to enable discovery/moderation.')
      } else {
        console.warn('[Watcher] Poll error:', err.message)
      }
      schedule(5000)
    }
  }

  // Start the loop shortly after boot
  schedule(2000)

  nitroApp.hooks.hook('close', () => {
    stopped = true
  })
})
