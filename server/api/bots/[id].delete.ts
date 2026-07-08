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

    const success = await db.deleteBot(botId)
    if (!success) {
      throw createError({
        statusCode: 404,
        statusMessage: `Bot with ID ${botId} not found`
      })
    }

    return {
      success: true,
      message: 'Bot deleted successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to delete bot: ${error.message}`
    })
  }
})
