import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { setTelegramWebhook } from '../../utils/telegram'

/**
 * Registers this deployment's /api/telegram/webhook URL with Telegram so
 * updates (discovery + moderation) get pushed to us.
 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const bot = await db.getBot()
    if (!bot) {
      throw createError({ statusCode: 404, statusMessage: 'No bot is configured' })
    }

    // Prefer an explicitly configured public URL, else infer from the request
    const body = await readBody(event).catch(() => ({}))
    const base =
      (body?.baseUrl && String(body.baseUrl).trim()) ||
      config.publicUrl ||
      getRequestURL(event).origin

    if (!base || base.startsWith('http://localhost')) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'A public HTTPS URL is required. Telegram cannot reach localhost — deploy first, or set NUXT_PUBLIC_URL.'
      })
    }

    const url = `${base.replace(/\/$/, '')}/api/telegram/webhook`
    const token = await decryptToken(bot.token)
    await setTelegramWebhook(token, url, config.webhookSecret)

    return { success: true, url }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to set webhook: ${error.message}`
    })
  }
})
