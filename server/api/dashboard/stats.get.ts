import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const groups = await db.getGroups()
    const schedules = await db.getSchedules()
    const logs = await db.getLogs()

    const totalGroups = groups.length
    const activeSchedules = schedules.filter(s => s.active)
    const activeSchedulesCount = activeSchedules.length

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const sentToday = logs.filter(
      l => new Date(l.sentAt) >= startOfDay && l.status === 'SUCCESS'
    ).length

    const failedToday = logs.filter(
      l => new Date(l.sentAt) >= startOfDay && l.status === 'FAILED'
    ).length

    // Calculate next scheduled message
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
        id: String(next.schedule.id),
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
