import { db, ModerationSettings } from './db'
import { deleteMessage, sendTelegramMessage, TelegramIncomingMessage, TelegramUpdate } from './telegram'

// Escape text so it is safe inside an HTML-parse-mode Telegram message.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Build a tappable Telegram mention for the sender. Using tg://user?id= makes
// it notify the user even when they have no @username set.
function buildMention(from?: TelegramIncomingMessage['from']): string {
  if (!from) return 'Someone'
  const displayName =
    [from.first_name, from.last_name].filter(Boolean).join(' ') ||
    (from.username ? `@${from.username}` : '') ||
    'user'
  return `<a href="tg://user?id=${from.id}">${escapeHtml(displayName)}</a>`
}

// Detect whether a message contains a link/URL.
export function hasLink(msg: TelegramIncomingMessage): boolean {
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])]
  if (entities.some(e => e.type === 'url' || e.type === 'text_link')) {
    return true
  }
  // Fallback: scan raw text/caption for common URL shapes
  const text = `${msg.text || ''} ${msg.caption || ''}`
  return /(https?:\/\/|www\.|t\.me\/|telegram\.me\/|\b[a-z0-9-]+\.(com|net|org|io|me|xyz|info|co|link)\b)/i.test(text)
}

export function isSticker(msg: TelegramIncomingMessage): boolean {
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

  const chatId = String(msg.chat.id)
  const who = msg.from?.username ? `@${msg.from.username}` : (msg.from?.first_name || 'user')
  const chatTitle = msg.chat.title || chatId

  try {
    await deleteMessage(token, chatId, msg.message_id)

    // Post a public notice in the group tagging the sender.
    const mention = buildMention(msg.from)
    const noticeText =
      reason === 'sticker'
        ? `🚫 ${mention}, stickers are not allowed in this group.`
        : `🚫 ${mention}, links are not allowed in this group.`
    try {
      await sendTelegramMessage(token, chatId, noticeText, 'HTML')
    } catch (notifyErr: any) {
      console.warn(`[Moderation] Deleted ${reason} but failed to post mention: ${notifyErr.message}`)
    }

    const group = await db.getGroupByChatId(chatId)
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
    console.warn(`[Moderation] Failed to delete ${reason} in chat ${chatId}: ${err.message}`)
  }
}

/**
 * Handle a single Telegram update: discover its chat, then moderate it.
 */
export async function handleTelegramUpdate(token: string, botUserId: number, update: TelegramUpdate) {
  const settings = await db.getModerationSettings()

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

  await autoRegisterChat(msg.chat)
  await moderateMessage(token, botUserId, msg, settings)
}
