import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.botId || !body.chatId || !body.message) {
      throw createError({
        statusCode: 400,
        statusMessage: 'botId, chatId, and message are required fields'
      })
    }

    const botId = parseInt(body.botId, 10)
    if (isNaN(botId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid botId format'
      })
    }

    const bot = await db.getBotById(botId)
    if (!bot) {
      throw createError({
        statusCode: 404,
        statusMessage: `Bot with ID ${botId} not found`
      })
    }

    const chatId = body.chatId.trim()
    const message = body.message.trim()
    const messageType = body.messageType || 'text'
    const mediaUrl = body.mediaUrl ? body.mediaUrl.trim() : ''
    const parseMode = body.parseMode || 'HTML'

    // Create queue item for sending
    const queueItem = await db.createQueueItem(
      botId,
      chatId,
      message,
      messageType,
      mediaUrl,
      parseMode,
      null // No schedule ID for ad-hoc manual messages
    )

    return {
      success: true,
      message: 'Message queued successfully for delivery',
      queueItem
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to queue message: ${error.message}`
    })
  }
})
