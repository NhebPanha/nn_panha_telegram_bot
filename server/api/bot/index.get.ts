import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const bot = await prisma.telegramBot.findFirst()
    if (!bot) {
      return {
        exists: false,
        bot: null
      }
    }

    return {
      exists: true,
      bot: {
        id: bot.id,
        username: bot.username,
        isActive: bot.isActive,
        createdAt: bot.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch bot settings: ${error.message}`
    })
  }
})
