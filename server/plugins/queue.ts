import { processQueue } from '../utils/queue'

export default defineNitroPlugin((nitroApp) => {
  console.log('[Nitro Plugin] Queue Processor initialized!')

  // Check the queue every 5 seconds
  const interval = setInterval(async () => {
    try {
      await processQueue()
    } catch (err) {
      console.error('[Queue Plugin] Error in queue processing loop:', err)
    }
  }, 5000)

  // Clean up interval on server close
  nitroApp.hooks.hook('close', () => {
    clearInterval(interval)
  })
})
