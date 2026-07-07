import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const idStr = getRouterParam(event, 'id')
    if (!idStr) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Schedule ID is required'
      })
    }

    const id = Number(idStr)
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Schedule ID format'
      })
    }

    const body = await readBody(event)
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body is required'
      })
    }

    const schedule = await db.getScheduleById(id)
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

    const updatedSchedule = await db.updateSchedule(id, {
      title: body.title !== undefined ? body.title.trim() : schedule.title,
      message: body.message !== undefined ? body.message.trim() : schedule.message,
      time,
      active: body.isActive !== undefined ? body.isActive : schedule.active
    })

    return {
      success: true,
      schedule: {
        id: String(updatedSchedule.id),
        title: updatedSchedule.title,
        message: updatedSchedule.message,
        time: updatedSchedule.time,
        isActive: updatedSchedule.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update schedule: ${error.message}`
    })
  }
})
