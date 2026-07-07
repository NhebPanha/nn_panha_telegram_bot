import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Schedule ID is required'
      })
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id }
    })

    if (!schedule) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Schedule not found'
      })
    }

    await prisma.schedule.delete({
      where: { id }
    })

    return {
      success: true,
      message: 'Schedule deleted successfully'
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to delete schedule: ${error.message}`
    })
  }
})
