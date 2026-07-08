import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id')
    if (!idParam) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bot ID is required'
      })
    }

    const botId = parseInt(idParam, 10)
    if (isNaN(botId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Bot ID format'
      })
    }

    const body = await readBody(event)
    const updates: any = {}

    if (body.active !== undefined) {
      updates.active = !!body.active
    }

    if (body.status !== undefined) {
      updates.status = body.status
    }

    const updated = await db.updateBot(botId, updates)

    return {
      success: true,
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
      statusMessage: error.statusMessage || `Failed to update bot: ${error.message}`
    })
  }
})
