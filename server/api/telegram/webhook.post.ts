import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { handleTelegramUpdate } from '../../utils/moderation'
import type { TelegramUpdate } from '../../utils/telegram'

/**
 * Telegram pushes updates here. Replaces the getUpdates long-polling loop,
 * which cannot run on Cloudflare Workers (no persistent background process).
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Authenticate the caller using the secret set during setWebhook
  const secret = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (!config.webhookSecret || secret !== config.webhookSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const update = await readBody<TelegramUpdate>(event)
  if (!update) return { ok: true }

  const bot = await db.getBot()
  if (!bot || !bot.active) return { ok: true }

  let token = ''
  try {
    token = await decryptToken(bot.token)
  } catch {
    return { ok: true }
  }

  const botUserId = parseInt(token.split(':')[0], 10)

  try {
    await handleTelegramUpdate(token, botUserId, update)
  } catch (err: any) {
    // Always 200 so Telegram doesn't retry-storm us
    console.error('[Webhook] Failed to handle update:', err.message)
  }

  return { ok: true }
})
