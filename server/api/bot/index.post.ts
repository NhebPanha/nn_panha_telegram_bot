import { db } from '../../utils/db'
import { encryptToken } from '../../utils/crypto'
import { verifyTelegramBot } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Telegram Bot Token is required'
      })
    }

    const token = body.token.trim()

    // 1. Verify the bot with Telegram API
    const botInfo = await verifyTelegramBot(token)

    // 2. Encrypt the token for secure storage
    const encryptedToken = await encryptToken(token)

    // 3. Save to database (single bot, overwrites any existing)
    const bot = await db.setBot(
      encryptedToken,
      botInfo.username || 'UnknownBot',
      botInfo.first_name || 'Telegram Bot',
      {
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      },
      true
    )

    return {
      success: true,
      bot: {
        id: bot.id,
        username: bot.username,
        firstName: bot.firstName,
        active: bot.active,
        permissions: bot.permissions,
        status: bot.status,
        createdAt: bot.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to save bot: ${error.message}`
    })
  }
})
