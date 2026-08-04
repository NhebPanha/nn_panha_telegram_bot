import { db } from '../../utils/db'

export default defineEventHandler(async () => {
  try {
    const settings = await db.getAiSettings()
    const keyConfigured = !!(useRuntimeConfig().geminiApiKey || '').trim()
    return { ...settings, keyConfigured }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch AI settings: ${error.message}`
    })
  }
})
