import cron from 'node-cron'
import { db } from '../utils/db'
import { decryptToken, encryptToken } from '../utils/crypto'
import { verifyTelegramBot } from '../utils/telegram'

// Helper to check if a single field of a cron expression matches the value
function matchCronField(field: string, val: number): boolean {
  if (field === '*') return true
  
  // Lists e.g., 1,2,5
  if (field.includes(',')) {
    return field.split(',').some(f => matchCronField(f, val))
  }
  
  // Ranges e.g., 1-5
  const rangeMatch = field.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10)
    const end = parseInt(rangeMatch[2], 10)
    return val >= start && val <= end
  }
  
  // Steps e.g., */5 or 1-10/2
  const stepParts = field.split('/')
  if (stepParts.length === 2) {
    const rangePart = stepParts[0]
    const step = parseInt(stepParts[1], 10)
    if (rangePart === '*') {
      return val % step === 0
    }
    const rangeMatch2 = rangePart.match(/^(\d+)-(\d+)$/)
    if (rangeMatch2) {
      const start = parseInt(rangeMatch2[1], 10)
      const end = parseInt(rangeMatch2[2], 10)
      if (val >= start && val <= end) {
        return (val - start) % step === 0
      }
    }
  }
  
  // Exact match
  return parseInt(field, 10) === val
}

// Full cron expression matcher (minute hour day-of-month month day-of-week)
function matchCronExpression(expression: string, minute: number, hour: number, day: number, month: number, dayOfWeek: number): boolean {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) {
    return false // Only support standard 5-field cron
  }
  return (
    matchCronField(fields[0], minute) &&
    matchCronField(fields[1], hour) &&
    matchCronField(fields[2], day) &&
    matchCronField(fields[3], month) &&
    matchCronField(fields[4], dayOfWeek)
  )
}

async function syncEnvironmentVariables() {
  try {
    const envToken = process.env.TELEGRAM_BOT_TOKEN
    const envChatId = process.env.TELEGRAM_GROUP_CHAT_ID

    let botId = 1

    if (envToken) {
      const trimmedToken = envToken.trim()
      if (trimmedToken) {
        const bots = await db.getBots()
        let existingBot = null
        
        for (const b of bots) {
          try {
            const dec = decryptToken(b.token)
            if (dec === trimmedToken) {
              existingBot = b
              break
            }
          } catch {}
        }

        if (!existingBot) {
          console.log('[Init] Syncing Telegram Bot Token from environment variable...')
          const encrypted = encryptToken(trimmedToken)
          let username = 'EnvBot'
          let firstName = 'Env Bot'
          try {
            const info = await verifyTelegramBot(trimmedToken)
            username = info.username || username
            firstName = info.first_name || firstName
          } catch (e: any) {
            console.warn('[Init] Failed to verify Telegram Bot Token from env:', e.message)
          }
          const newBot = await db.createBot(encrypted, username, firstName, {
            can_join_groups: true,
            can_read_all_group_messages: true,
            supports_inline_queries: false
          }, true)
          botId = newBot.id
          console.log('[Init] Telegram Bot Token synced successfully.')
        } else {
          botId = existingBot.id
        }
      }
    }

    if (envChatId) {
      const trimmedChatId = envChatId.trim()
      if (trimmedChatId) {
        const existing = await db.getGroupByChatId(trimmedChatId)
        if (!existing) {
          console.log('[Init] Adding Telegram Group from environment variable chat ID:', trimmedChatId)
          await db.createGroup('Default Group (Env)', trimmedChatId, 'group', botId, true)
          console.log('[Init] Group added successfully.')
        }
      }
    }
  } catch (error: any) {
    console.error('[Init] Error syncing environment variables:', error.message)
  }
}

async function seedDefaultSchedules() {
  try {
    const schedules = await db.getSchedules()
    if (schedules.length === 0) {
      const bots = await db.getBots()
      const primaryBotId = bots.length > 0 ? bots[0].id : 1

      console.log('[Cron] Seeding default schedules...')
      await db.createSchedule('Morning Message', 'Good morning everyone 🌞', '08:00', 'daily', 'Asia/Phnom_Penh', primaryBotId, 'text', '', 'HTML')
      await db.createSchedule('Lunch Reminder', 'Good afternoon ☀️', '12:00', 'daily', 'Asia/Phnom_Penh', primaryBotId, 'text', '', 'HTML')
      await db.createSchedule('Evening Message', 'Good evening 🌙', '17:00', 'daily', 'Asia/Phnom_Penh', primaryBotId, 'text', '', 'HTML')
      console.log('[Cron] Default schedules seeded successfully!')
    }
  } catch (error) {
    console.error('[Cron] Failed to seed default schedules:', error)
  }
}

export default defineNitroPlugin((nitroApp) => {
  console.log('[Nitro Plugin] Cron Scheduler initialized!')
  
  // Sync environment variables and seed database on load
  syncEnvironmentVariables().then(() => {
    seedDefaultSchedules()
  })

  // Schedule cron to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const schedules = await db.getSchedules()
      const activeSchedules = schedules.filter(s => s.active)

      if (activeSchedules.length === 0) {
        return
      }

      const groups = await db.getGroups()
      const activeGroups = groups.filter(g => g.active)

      for (const schedule of activeSchedules) {
        // Resolve date time details in the schedule's target timezone
        const tzString = schedule.timezone || 'Asia/Phnom_Penh'
        let tzDate: Date
        try {
          tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzString }))
        } catch (tzError) {
          console.error(`[Cron] Invalid timezone "${tzString}" in schedule "${schedule.title}", falling back to local time.`)
          tzDate = now
        }

        const minutes = tzDate.getMinutes()
        const hours = tzDate.getHours()
        const dayOfMonth = tzDate.getDate()
        const month = tzDate.getMonth() + 1 // 1-12
        const dayOfWeek = tzDate.getDay() // 0-6 (0 is Sunday)

        const currentTimeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

        let isMatch = false

        if (schedule.type === 'daily') {
          isMatch = schedule.time === currentTimeString
        } else if (schedule.type === 'weekly') {
          isMatch = schedule.time === currentTimeString && schedule.dayOfWeek === dayOfWeek
        } else if (schedule.type === 'monthly') {
          isMatch = schedule.time === currentTimeString && schedule.dayOfMonth === dayOfMonth
        } else if (schedule.type === 'one_time') {
          isMatch = schedule.time === currentTimeString && !schedule.lastExecutedAt
        } else if (schedule.type === 'cron') {
          isMatch = matchCronExpression(schedule.time, minutes, hours, dayOfMonth, month, dayOfWeek)
        }

        if (isMatch) {
          console.log(`[Cron] Schedule "${schedule.title}" matches current time. Queueing broadcasts...`)

          // Filter groups: must be active, and if groups are bound to a specific bot, match the schedule's bot ID
          const targetGroups = activeGroups.filter(
            g => g.botId === null || g.botId === schedule.botId
          )

          if (targetGroups.length === 0) {
            console.log(`[Cron] No active target groups matches bot ID ${schedule.botId} for schedule: ${schedule.title}`)
            continue
          }

          // Enqueue message dispatch for each group target
          for (const group of targetGroups) {
            await db.createQueueItem(
              schedule.botId,
              group.chatId,
              schedule.message,
              schedule.messageType,
              schedule.mediaUrl,
              schedule.parseMode,
              schedule.id
            )
          }

          // Mark schedule execution
          await db.updateSchedule(schedule.id, {
            lastExecutedAt: now.toISOString(),
            active: schedule.type === 'one_time' ? false : schedule.active
          })
        }
      }
    } catch (err) {
      console.error('[Cron] Critical error in cron scheduler process:', err)
    }
  })
})
