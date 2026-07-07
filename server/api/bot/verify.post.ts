import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { verifyTelegramBot } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const bot = await db.getBot()
    if (!bot || !bot.token) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No bot token configured. Please save a bot token first.'
      })
    }

    const decryptedToken = decryptToken(bot.token)
    const botInfo = await verifyTelegramBot(decryptedToken)

    // Update the bot's username or display name in the JSON database
    const updatedBot = await db.saveBot({
      username: botInfo.username || botInfo.first_name
    })

    return {
      success: true,
      botInfo,
      bot: {
        id: '1',
        username: updatedBot.username || null,
        isActive: updatedBot.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to verify bot: ${error.message}`
    })
  }
})
