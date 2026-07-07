import cron from 'node-cron'
import { prisma } from '../utils/prisma'
import { decryptToken } from '../utils/crypto'
import { sendTelegramMessage } from '../utils/telegram'

async function seedDefaultSchedules() {
  try {
    const count = await prisma.schedule.count()
    if (count === 0) {
      console.log('[Cron] Seeding default schedules...')
      await prisma.schedule.createMany({
        data: [
          {
            title: 'Morning Greeting',
            time: '08:00',
            message: 'Good morning everyone 🌞 Have a productive day.',
            isActive: true
          },
          {
            title: 'Noon Reminder',
            time: '12:00',
            message: "Good afternoon ☀️ Don't forget to complete your tasks.",
            isActive: true
          },
          {
            title: 'Evening Wrap-up',
            time: '17:00',
            message: "Good evening 🌙 Thank you for today's work.",
            isActive: true
          }
        ]
      })
      console.log('[Cron] Default schedules seeded successfully!')
    }
  } catch (error) {
    console.error('[Cron] Failed to seed default schedules:', error)
  }
}

export default defineNitroPlugin((nitroApp) => {
  console.log('[Nitro Plugin] Cron Scheduler initialized!')
  
  // Seed database
  seedDefaultSchedules()

  // Schedule cron to run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${hours}:${minutes}`

      // Query active schedules matching current local time
      const matchingSchedules = await prisma.schedule.findMany({
        where: {
          time: currentTime,
          isActive: true
        }
      })

      if (matchingSchedules.length === 0) {
        return
      }

      console.log(`[Cron] Found ${matchingSchedules.length} active schedule(s) matching time ${currentTime}`)

      const bot = await prisma.telegramBot.findFirst({
        where: { isActive: true }
      })

      const activeGroups = await prisma.telegramGroup.findMany({
        where: { isActive: true }
      })

      for (const schedule of matchingSchedules) {
        if (activeGroups.length === 0) {
          console.log(`[Cron] No active groups configured to receive schedule: ${schedule.title}`)
          continue
        }

        if (!bot) {
          console.warn('[Cron] No active Telegram bot configured. Logging failures.')
          for (const group of activeGroups) {
            await prisma.messageLog.create({
              data: {
                groupId: group.id,
                scheduleId: schedule.id,
                message: schedule.message,
                status: 'FAILED',
                error: 'No active Telegram bot configured in the system.'
              }
            })
          }
          continue
        }

        let decryptedToken = ''
        try {
          decryptedToken = decryptToken(bot.token)
        } catch (decryptionError: any) {
          console.error('[Cron] Decryption of bot token failed:', decryptionError)
          for (const group of activeGroups) {
            await prisma.messageLog.create({
              data: {
                groupId: group.id,
                scheduleId: schedule.id,
                message: schedule.message,
                status: 'FAILED',
                error: `Token decryption failed: ${decryptionError.message}`
              }
            })
          }
          continue
        }

        // Send sequentially to active groups
        for (const group of activeGroups) {
          let status = 'SUCCESS'
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
          await prisma.messageLog.create({
            data: {
              groupId: group.id,
              scheduleId: schedule.id,
              message: schedule.message,
              status,
              error: errorMessage
            }
          })

          // Prevent Telegram rate limits (500ms delay)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    } catch (err) {
      console.error('[Cron] Critical error in cron scheduler process:', err)
    }
  })
})
