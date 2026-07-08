import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.botId || !body.chatId || !body.message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'botId, chatId, and message are required'
      })
    }

    const botId = parseInt(body.botId, 10)
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

    let response
    try {
      const token = decryptToken(bot.token)
      response = await sendTelegramMessage(token, body.chatId, body.message, 'HTML')
    } catch (err: any) {
      // Create failure log
      await db.createLog(
        botId,
        null,
        `Test Chat ID: ${body.chatId}`,
        null,
        body.message,
        'FAILED',
        err.message
      )
      
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to send test message: ${err.message}`
      })
    }

    // Create success log
    const log = await db.createLog(
      botId,
      null,
      `Test Chat ID: ${body.chatId}`,
      null,
      body.message,
      'SUCCESS',
      null,
      response
    )

    return {
      success: true,
      log
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Test message failed: ${error.message}`
    })
  }
})
