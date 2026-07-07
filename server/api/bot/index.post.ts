import { prisma } from '../../utils/prisma'
import { encryptToken } from '../../utils/crypto'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.token) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Token is required'
      })
    }

    const encryptedToken = encryptToken(body.token.trim())

    const existingBot = await prisma.telegramBot.findFirst()
    let bot
    if (existingBot) {
      bot = await prisma.telegramBot.update({
        where: { id: existingBot.id },
        data: {
          token: encryptedToken,
          isActive: body.isActive !== undefined ? body.isActive : true
        }
      })
    } else {
      bot = await prisma.telegramBot.create({
        data: {
          token: encryptedToken,
          isActive: true
        }
      })
    }

    return {
      success: true,
      bot: {
        id: bot.id,
        username: bot.username,
        isActive: bot.isActive,
        createdAt: bot.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to save bot token: ${error.message}`
    })
  }
})
