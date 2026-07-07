import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const totalGroups = await prisma.telegramGroup.count()
    const activeSchedulesCount = await prisma.schedule.count({
      where: { isActive: true }
    })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const sentToday = await prisma.messageLog.count({
      where: {
        sentAt: { gte: startOfDay },
        status: 'SUCCESS'
      }
    })

    const failedToday = await prisma.messageLog.count({
      where: {
        sentAt: { gte: startOfDay },
        status: 'FAILED'
      }
    })

    // Calculate next scheduled message
    const activeSchedules = await prisma.schedule.findMany({
      where: { isActive: true }
    })

    let nextSchedule = null
    if (activeSchedules.length > 0) {
      const now = new Date()
      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentMinutesTotal = currentHours * 60 + currentMinutes

      const schedulesWithDiff = activeSchedules.map(s => {
        const [hoursStr, minutesStr] = s.time.split(':')
        const hours = parseInt(hoursStr)
        const minutes = parseInt(minutesStr)
        const scheduleMinutes = hours * 60 + minutes

        let diff = scheduleMinutes - currentMinutesTotal
        let runsToday = true
        if (diff <= 0) {
          diff += 1440 // 24 hours in minutes
          runsToday = false
        }

        const execTime = new Date()
        execTime.setHours(hours, minutes, 0, 0)
        if (!runsToday) {
          execTime.setDate(execTime.getDate() + 1)
        }

        return {
          schedule: s,
          diff,
          execTime
        }
      })

      // Sort by difference in minutes ascending
      schedulesWithDiff.sort((a, b) => a.diff - b.diff)
      const next = schedulesWithDiff[0]
      nextSchedule = {
        id: next.schedule.id,
        title: next.schedule.title,
        time: next.schedule.time,
        message: next.schedule.message,
        execTime: next.execTime.toISOString(),
        minutesLeft: next.diff
      }
    }

    return {
      totalGroups,
      activeSchedules: activeSchedulesCount,
      sentToday,
      failedToday,
      nextSchedule
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to calculate dashboard statistics: ${error.message}`
    })
  }
})
