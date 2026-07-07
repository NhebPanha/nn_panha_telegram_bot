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

    const body = await readBody(event)
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body is required'
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

    let time = schedule.time
    if (body.time) {
      time = body.time.trim()
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
      if (!timeRegex.test(time)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid time format. Time must be in HH:MM (24-hour) format'
        })
      }
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title.trim() : schedule.title,
        message: body.message !== undefined ? body.message.trim() : schedule.message,
        time,
        isActive: body.isActive !== undefined ? body.isActive : schedule.isActive
      }
    })

    return {
      success: true,
      schedule: updatedSchedule
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update schedule: ${error.message}`
    })
  }
})
