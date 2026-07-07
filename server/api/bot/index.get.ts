import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const bot = await db.getBot()
    if (!bot || !bot.token) {
      return {
        exists: false,
        bot: null
      }
    }

    return {
      exists: true,
      bot: {
        id: '1',
        username: bot.username || null,
        isActive: bot.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch bot settings: ${error.message}`
    })
  }
})
