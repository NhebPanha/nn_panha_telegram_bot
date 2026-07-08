import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { verifyTelegramBot } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bot ID is required'
      })
    }

    const botId = parseInt(body.id, 10)
    if (isNaN(botId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Bot ID format'
      })
    }

    const bot = await db.getBotById(botId)
    if (!bot) {
      throw createError({
        statusCode: 404,
        statusMessage: `Bot with ID ${botId} not found`
      })
    }

    let botInfo
    let status: 'ONLINE' | 'OFFLINE' = 'ONLINE'

    try {
      const token = decryptToken(bot.token)
      botInfo = await verifyTelegramBot(token)
    } catch (err: any) {
      status = 'OFFLINE'
      await db.updateBot(botId, { status: 'OFFLINE' })
      return {
        success: false,
        status: 'OFFLINE',
        message: `Verification failed: ${err.message}`,
        bot: {
          ...bot,
          status: 'OFFLINE'
        }
      }
    }

    // Refresh credentials on success
    const updated = await db.updateBot(botId, {
      username: botInfo.username || bot.username,
      firstName: botInfo.first_name || bot.firstName,
      status: 'ONLINE',
      permissions: {
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      }
    })

    return {
      success: true,
      status: 'ONLINE',
      bot: {
        id: updated.id,
        username: updated.username,
        firstName: updated.firstName,
        active: updated.active,
        permissions: updated.permissions,
        status: updated.status,
        createdAt: updated.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Verification process failed: ${error.message}`
    })
  }
})
