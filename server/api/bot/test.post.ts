import { prisma } from '../../utils/prisma'
import { decryptToken } from '../../utils/crypto'
import { sendTelegramMessage } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.chatId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Chat ID is required'
      })
    }

    const messageText = body.message || 'Test message from your Telegram Bot Management System! 🚀'

    const bot = await prisma.telegramBot.findFirst()
    if (!bot) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No bot token configured. Please save a token first.'
      })
    }

    const group = await prisma.telegramGroup.findUnique({
      where: { chatId: body.chatId }
    })

    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found. Please add the group in Group Management first.'
      })
    }

    const decryptedToken = decryptToken(bot.token)
    
    let status = 'SUCCESS'
    let errorMessage: string | null = null

    try {
      await sendTelegramMessage(decryptedToken, body.chatId, messageText)
    } catch (error: any) {
      status = 'FAILED'
      errorMessage = error.message
    }

    // Save message log
    const log = await prisma.messageLog.create({
      data: {
        groupId: group.id,
        message: messageText,
        status,
        error: errorMessage
      },
      include: {
        group: true
      }
    })

    if (status === 'FAILED') {
      throw createError({
        statusCode: 502,
        statusMessage: `Telegram API error: ${errorMessage}`
      })
    }

    return {
      success: true,
      log
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to send test message: ${error.message}`
    })
  }
})
