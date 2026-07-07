import { prisma } from '../../utils/prisma'
import { decryptToken } from '../../utils/crypto'
import { verifyTelegramBot } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const bot = await prisma.telegramBot.findFirst()
    if (!bot) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No bot token configured. Please save a bot token first.'
      })
    }

    const decryptedToken = decryptToken(bot.token)
    const botInfo = await verifyTelegramBot(decryptedToken)

    // Update the bot's username or display name in the database
    const updatedBot = await prisma.telegramBot.update({
      where: { id: bot.id },
      data: {
        username: botInfo.username || botInfo.first_name
      }
    })

    return {
      success: true,
      botInfo,
      bot: {
        id: updatedBot.id,
        username: updatedBot.username,
        isActive: updatedBot.isActive,
        createdAt: updatedBot.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to verify bot: ${error.message}`
    })
  }
})
