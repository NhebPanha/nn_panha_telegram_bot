import { db } from '../../utils/db'
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

    const bot = await db.saveBot({
      token: encryptedToken,
      active: body.isActive !== undefined ? body.isActive : true
    })

    return {
      success: true,
      bot: {
        id: '1',
        username: bot.username || null,
        isActive: bot.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to save bot token: ${error.message}`
    })
  }
})
