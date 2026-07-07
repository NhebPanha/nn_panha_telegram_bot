import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const schedules = await prisma.schedule.findMany({
      orderBy: { time: 'asc' }
    })
    return schedules
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch schedules: ${error.message}`
    })
  }
})
