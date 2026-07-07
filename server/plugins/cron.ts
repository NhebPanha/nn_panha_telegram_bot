import cron from 'node-cron'
import { db } from '../utils/db'
import { decryptToken, encryptToken } from '../utils/crypto'
import { sendTelegramMessage, verifyTelegramBot } from '../utils/telegram'

async function syncEnvironmentVariables() {
  try {
    const envToken = process.env.TELEGRAM_BOT_TOKEN
    const envChatId = process.env.TELEGRAM_GROUP_CHAT_ID

    if (envToken) {
      const trimmedToken = envToken.trim()
      if (trimmedToken) {
        const bot = await db.getBot()
        let isSame = false
        if (bot.token) {
          try {
            const currentToken = decryptToken(bot.token)
            isSame = currentToken === trimmedToken
          } catch {}
        }
        if (!isSame) {
          console.log('[Init] Syncing Telegram Bot Token from environment variable...')
          const encrypted = encryptToken(trimmedToken)
          let username = 'EnvBot'
          try {
            const info = await verifyTelegramBot(trimmedToken)
            username = info.username || info.first_name
          } catch (e: any) {
            console.warn('[Init] Failed to verify Telegram Bot Token from env:', e.message)
          }
          await db.saveBot({
            token: encrypted,
            username,
            active: true
          })
          console.log('[Init] Telegram Bot Token synced successfully.')
        }
      }
    }

    if (envChatId) {
      const trimmedChatId = envChatId.trim()
      if (trimmedChatId) {
        const existing = await db.getGroupByChatId(trimmedChatId)
        if (!existing) {
          console.log('[Init] Adding Telegram Group from environment variable chat ID:', trimmedChatId)
          await db.createGroup('Default Group (Env)', trimmedChatId, true)
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
      console.log('[Cron] Seeding default schedules...')
      await db.createSchedule('Morning Message', 'Good morning everyone 🌞', '08:00', true)
      await db.createSchedule('Lunch Reminder', 'Good afternoon ☀️', '12:00', true)
      await db.createSchedule('Evening Message', 'Good evening 🌙', '17:00', true)
      console.log('[Cron] Default schedules seeded successfully!')
    }
  } catch (error) {
    console.error('[Cron] Failed to seed default schedules:', error)
  }
}

export default defineNitroPlugin((nitroApp) => {
  console.log('[Nitro Plugin] Cron Scheduler initialized!')
  
  // Sync environment variables and seed database
  syncEnvironmentVariables().then(() => {
    seedDefaultSchedules()
  })

  // Schedule cron to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${hours}:${minutes}`

      // Query active schedules matching current local time
      const schedules = await db.getSchedules()
      const matchingSchedules = schedules.filter(s => s.active && s.time === currentTime)

      if (matchingSchedules.length === 0) {
        return
      }

      console.log(`[Cron] Found ${matchingSchedules.length} active schedule(s) matching time ${currentTime}`)

      const bot = await db.getBot()
      const groups = await db.getGroups()
      const activeGroups = groups.filter(g => g.active)

      for (const schedule of matchingSchedules) {
        if (activeGroups.length === 0) {
          console.log(`[Cron] No active groups configured to receive schedule: ${schedule.title}`)
          continue
        }

        if (!bot || !bot.token || !bot.active) {
          console.warn('[Cron] No active Telegram bot configured. Logging failures.')
          for (const group of activeGroups) {
            await db.createLog(
              group.id,
              schedule.id,
              schedule.message,
              'FAILED',
              'No active Telegram bot configured in the system.'
            )
          }
          continue
        }

        let decryptedToken = ''
        try {
          decryptedToken = decryptToken(bot.token)
        } catch (decryptionError: any) {
          console.error('[Cron] Decryption of bot token failed:', decryptionError)
          for (const group of activeGroups) {
            await db.createLog(
              group.id,
              schedule.id,
              schedule.message,
              'FAILED',
              `Token decryption failed: ${decryptionError.message}`
            )
          }
          continue
        }

        // Send sequentially to active groups
        for (const group of activeGroups) {
          let status = 'SUCCESS' as 'SUCCESS' | 'FAILED'
          let errorMessage: string | null = null

          try {
            await sendTelegramMessage(decryptedToken, group.chatId, schedule.message)
            console.log(`[Cron] Successfully sent schedule "${schedule.title}" to group "${group.name}"`)
          } catch (error: any) {
            status = 'FAILED'
            errorMessage = error.message
            console.error(`[Cron] Failed to send schedule "${schedule.title}" to group "${group.name}":`, error)
          }

          // Save execution log
          await db.createLog(group.id, schedule.id, schedule.message, status, errorMessage)

          // Prevent Telegram rate limits (500ms delay)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    } catch (err) {
      console.error('[Cron] Critical error in cron scheduler process:', err)
    }
  })
})
