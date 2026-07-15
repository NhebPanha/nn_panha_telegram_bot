import { db, JSONSchedule, JSONGroup } from './db'
import { decryptToken, encryptToken } from './crypto'
import {
  verifyTelegramBot,
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVideo,
  sendTelegramDocument
} from './telegram'

// Sequential delay helper (Telegram rate-limit protection)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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
function matchCronExpression(
  expression: string,
  minute: number,
  hour: number,
  day: number,
  month: number,
  dayOfWeek: number
): boolean {
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

const isValidChatId = (v: string) => /^-?\d+$/.test(v) || /^@[A-Za-z0-9_]{3,}$/.test(v)

export async function syncEnvironmentVariables() {
  try {
    const config = useRuntimeConfig()
    const envToken = (config.telegramBotToken || '').trim()
    const envChatId = (config.telegramGroupChatId || '').trim()

    if (envToken) {
      const existing = await db.getBot()
      let sameToken = false
      if (existing) {
        try {
          sameToken = (await decryptToken(existing.token)) === envToken
        } catch {}
      }

      if (!existing || !sameToken) {
        console.log('[Init] Syncing Telegram Bot Token from environment variable...')
        const encrypted = await encryptToken(envToken)
        let username = 'EnvBot'
        let firstName = 'Env Bot'
        let permissions = {
          can_join_groups: true,
          can_read_all_group_messages: true,
          supports_inline_queries: false
        }
        try {
          const info = await verifyTelegramBot(envToken)
          username = info.username || username
          firstName = info.first_name || firstName
          permissions = {
            can_join_groups: info.can_join_groups,
            can_read_all_group_messages: info.can_read_all_group_messages,
            supports_inline_queries: info.supports_inline_queries
          }
        } catch (e: any) {
          console.warn('[Init] Failed to verify Telegram Bot Token from env:', e.message)
        }
        await db.setBot(encrypted, username, firstName, permissions, true)
        console.log('[Init] Telegram Bot Token synced successfully.')
      }
    }

    if (envChatId && isValidChatId(envChatId)) {
      const existing = await db.getGroupByChatId(envChatId)
      if (!existing) {
        console.log('[Init] Adding Telegram Group from environment chat ID:', envChatId)
        await db.createGroup('Default Group (Env)', envChatId, 'group', true)
      }
    } else if (envChatId) {
      console.warn(`[Init] TELEGRAM_GROUP_CHAT_ID "${envChatId}" is not a valid chat ID. Skipping auto-seed.`)
    }
  } catch (error: any) {
    console.error('[Init] Error syncing environment variables:', error.message)
  }
}

export async function seedDefaultSchedules() {
  try {
    const schedules = await db.getSchedules()
    if (schedules.length === 0) {
      console.log('[Cron] Seeding default schedules...')
      await db.createSchedule('Morning Message', 'Good morning everyone 🌞', '08:00', 'daily', 'Asia/Phnom_Penh', 'text', '', 'HTML')
      await db.createSchedule('Lunch Reminder', 'Good afternoon ☀️', '12:00', 'daily', 'Asia/Phnom_Penh', 'text', '', 'HTML')
      await db.createSchedule('Evening Message', 'Good evening 🌙', '17:00', 'daily', 'Asia/Phnom_Penh', 'text', '', 'HTML')
      console.log('[Cron] Default schedules seeded successfully!')
    }
  } catch (error) {
    console.error('[Cron] Failed to seed default schedules:', error)
  }
}

// Dispatch a schedule's message to every active target, sequentially with a
// 500ms delay between sends to stay within Telegram rate limits.
async function dispatchSchedule(schedule: JSONSchedule, groups: JSONGroup[], token: string) {
  for (const group of groups) {
    let response: any = null
    try {
      if (schedule.messageType === 'photo' && schedule.mediaUrl) {
        response = await sendTelegramPhoto(token, group.chatId, schedule.mediaUrl, schedule.message, schedule.parseMode)
      } else if (schedule.messageType === 'video' && schedule.mediaUrl) {
        response = await sendTelegramVideo(token, group.chatId, schedule.mediaUrl, schedule.message, schedule.parseMode)
      } else if (schedule.messageType === 'document' && schedule.mediaUrl) {
        response = await sendTelegramDocument(token, group.chatId, schedule.mediaUrl, schedule.message, schedule.parseMode)
      } else {
        response = await sendTelegramMessage(token, group.chatId, schedule.message, schedule.parseMode)
      }

      await db.createLog(group.id, group.name, schedule.id, schedule.message, 'SUCCESS', null, response)
      console.log(`[Cron] Sent "${schedule.title}" to ${group.name} (${group.chatId}).`)
    } catch (sendError: any) {
      await db.createLog(group.id, group.name, schedule.id, schedule.message, 'FAILED', sendError.message)
      console.error(`[Cron] Failed to send "${schedule.title}" to ${group.name}:`, sendError.message)
    }

    // Rate-limit safeguard between sequential dispatches
    await delay(500)
  }
}

/**
 * Runs one scheduler tick. Invoked every minute by the Cloudflare cron trigger.
 */
export async function runScheduledBroadcast(now = new Date()) {
  await syncEnvironmentVariables()
  await seedDefaultSchedules()

  const schedules = await db.getSchedules()
  const activeSchedules = schedules.filter(s => s.active)
  if (activeSchedules.length === 0) return { dispatched: 0 }

  // Single bot must be configured and active to broadcast
  const bot = await db.getBot()
  if (!bot || !bot.active) return { dispatched: 0 }

  let token = ''
  try {
    token = await decryptToken(bot.token)
  } catch (e: any) {
    console.error('[Cron] Failed to decrypt bot token:', e.message)
    return { dispatched: 0 }
  }

  const groups = await db.getGroups()
  const activeGroups = groups.filter(g => g.active)
  let dispatched = 0

  for (const schedule of activeSchedules) {
    // Resolve date time details in the schedule's target timezone
    const tzString = schedule.timezone || 'Asia/Phnom_Penh'
    let tzDate: Date
    try {
      tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzString }))
    } catch {
      console.error(`[Cron] Invalid timezone "${tzString}" in schedule "${schedule.title}", using local time.`)
      tzDate = now
    }

    const minutes = tzDate.getMinutes()
    const hours = tzDate.getHours()
    const dayOfMonth = tzDate.getDate()
    const month = tzDate.getMonth() + 1
    const dayOfWeek = tzDate.getDay()
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

    if (!isMatch) continue

    if (activeGroups.length === 0) {
      console.log(`[Cron] Schedule "${schedule.title}" matched but there are no active target groups.`)
      continue
    }

    console.log(`[Cron] Schedule "${schedule.title}" matches. Dispatching broadcasts...`)
    await dispatchSchedule(schedule, activeGroups, token)
    dispatched++

    await db.updateSchedule(schedule.id, {
      lastExecutedAt: now.toISOString(),
      active: schedule.type === 'one_time' ? false : schedule.active
    })
  }

  return { dispatched }
}
