import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const schedules = await db.getSchedules()
    
    // Sort schedules by time ascending (HH:MM)
    const sorted = [...schedules].sort((a, b) => a.time.localeCompare(b.time))

    return sorted.map(s => ({
      id: String(s.id),
      title: s.title,
      message: s.message,
      time: s.time,
      isActive: s.active,
      createdAt: new Date().toISOString()
    }))
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch schedules: ${error.message}`
    })
  }
})
