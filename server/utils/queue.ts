import { db, QueueItem, JSONBot } from './db'
import { decryptToken } from './crypto'
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramVideo,
  sendTelegramDocument
} from './telegram'

// Sequential delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function processQueue() {
  const queue = await db.getQueue()
  const now = new Date()

  // Filter items that are ready to be sent
  const activeItems = queue.filter(
    (item) =>
      (item.status === 'PENDING' || item.status === 'RETRYING') &&
      new Date(item.nextAttemptAt) <= now
  )

  if (activeItems.length === 0) {
    return
  }

  console.log(`[Queue Processor] Found ${activeItems.length} ready queue item(s) to process.`)

  // Process sequentially to honor rate limits and prevent flood blocks
  for (const item of activeItems) {
    let decryptedToken = ''
    let bot: JSONBot | null = null

    try {
      bot = await db.getBotById(item.botId)
      if (!bot) {
        throw new Error(`Associated bot with ID ${item.botId} not found`)
      }
      if (!bot.active) {
        throw new Error(`Associated bot "${bot.username}" is inactive`)
      }

      decryptedToken = decryptToken(bot.token)
    } catch (setupError: any) {
      console.error(`[Queue Processor] Setup failed for item ${item.id}:`, setupError.message)
      
      // Update queue item
      await db.updateQueueItem(item.id, {
        status: 'FAILED',
        error: setupError.message
      })

      // Log failure
      await db.createLog(
        item.botId,
        null,
        `Chat ID: ${item.chatId}`,
        item.scheduleId,
        item.message,
        'FAILED',
        setupError.message
      )
      continue
    }

    let success = false
    let errMessage = ''
    let response: any = null
    let rateLimitDelay = 0

    try {
      // Send based on messageType
      if (item.messageType === 'photo' && item.mediaUrl) {
        response = await sendTelegramPhoto(decryptedToken, item.chatId, item.mediaUrl, item.message, item.parseMode)
      } else if (item.messageType === 'video' && item.mediaUrl) {
        response = await sendTelegramVideo(decryptedToken, item.chatId, item.mediaUrl, item.message, item.parseMode)
      } else if (item.messageType === 'document' && item.mediaUrl) {
        response = await sendTelegramDocument(decryptedToken, item.chatId, item.mediaUrl, item.message, item.parseMode)
      } else {
        // Fallback to text message
        response = await sendTelegramMessage(decryptedToken, item.chatId, item.message, item.parseMode)
      }
      success = true
    } catch (sendError: any) {
      errMessage = sendError.message
      console.error(`[Queue Processor] Send error for item ${item.id}:`, errMessage)

      // Check for Telegram flood wait rate limits (e.g. "Too Many Requests: retry after 30")
      const retryAfterMatch = errMessage.match(/retry after (\d+)/i)
      if (retryAfterMatch && retryAfterMatch[1]) {
        rateLimitDelay = parseInt(retryAfterMatch[1], 10)
        console.warn(`[Queue Processor] Rate limited by Telegram. Must wait ${rateLimitDelay} seconds.`)
      }
    }

    if (success) {
      // Create success log
      await db.createLog(
        item.botId,
        null, // Will resolve group ID if possible inside api or keep as null
        `Chat ID: ${item.chatId}`,
        item.scheduleId,
        item.message,
        'SUCCESS',
        null,
        response
      )

      // Delete item from queue upon success
      await db.deleteQueueItem(item.id)
      console.log(`[Queue Processor] Item ${item.id} sent successfully.`)
    } else {
      // Handle Failure & Retries
      const nextAttempt = item.attempts + 1

      if (rateLimitDelay > 0) {
        // If rate limited, adjust the next attempt time by the recommended wait, but don't count as standard attempt penalty
        const nextTime = new Date()
        nextTime.setSeconds(nextTime.getSeconds() + rateLimitDelay + 2) // add buffer seconds

        await db.updateQueueItem(item.id, {
          status: 'RETRYING',
          nextAttemptAt: nextTime.toISOString(),
          error: `Telegram Rate Limit: retry after ${rateLimitDelay}s`
        })

        // Log retrying state
        await db.createLog(
          item.botId,
          null,
          `Chat ID: ${item.chatId}`,
          item.scheduleId,
          item.message,
          'RETRYING',
          `Telegram Rate Limit: retry after ${rateLimitDelay}s`
        )
      } else if (nextAttempt >= item.maxAttempts) {
        // Max retries reached - mark as FAILED
        await db.updateQueueItem(item.id, {
          status: 'FAILED',
          attempts: nextAttempt,
          error: errMessage
        })

        // Log final failure
        await db.createLog(
          item.botId,
          null,
          `Chat ID: ${item.chatId}`,
          item.scheduleId,
          item.message,
          'FAILED',
          `Max attempts (${item.maxAttempts}) reached. Last error: ${errMessage}`
        )
      } else {
        // Schedule next retry based on retry policy (1st: 30s, 2nd: 2m, 3rd: 10m)
        let retrySeconds = 30
        if (nextAttempt === 2) retrySeconds = 120 // 2 minutes
        if (nextAttempt === 3) retrySeconds = 600 // 10 minutes

        const nextTime = new Date()
        nextTime.setSeconds(nextTime.getSeconds() + retrySeconds)

        await db.updateQueueItem(item.id, {
          status: 'RETRYING',
          attempts: nextAttempt,
          nextAttemptAt: nextTime.toISOString(),
          error: errMessage
        })

        // Log retry attempt
        await db.createLog(
          item.botId,
          null,
          `Chat ID: ${item.chatId}`,
          item.scheduleId,
          item.message,
          'RETRYING',
          `Attempt ${nextAttempt} failed: ${errMessage}. Retrying in ${retrySeconds}s`
        )
      }
    }

    // Rate limiting safeguard between sequential sends: wait 500ms
    await delay(500)
  }
}
