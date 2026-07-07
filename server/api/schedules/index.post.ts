import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.title || !body.message || !body.time) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title, Message, and Time are required'
      })
    }

    const title = body.title.trim()
    const message = body.message.trim()
    const time = body.time.trim()

    // Validate 24-hour time format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(time)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid time format. Time must be in HH:MM (24-hour) format, e.g., "08:00" or "17:15"'
      })
    }

    const schedule = await prisma.schedule.create({
      data: {
        title,
        message,
        time,
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    })

    return {
      success: true,
      schedule
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to create schedule: ${error.message}`
    })
  }
})
