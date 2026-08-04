import { db } from '../../utils/db'

const ALLOWED_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-pro-latest'
])

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const updates: Record<string, any> = {}

    if (body.enabled !== undefined) updates.enabled = !!body.enabled
    if (body.replyOnMention !== undefined) updates.replyOnMention = !!body.replyOnMention
    if (typeof body.systemPrompt === 'string') updates.systemPrompt = body.systemPrompt.trim()

    if (typeof body.model === 'string') {
      if (!ALLOWED_MODELS.has(body.model)) {
        throw createError({ statusCode: 400, statusMessage: 'Unsupported model' })
      }
      updates.model = body.model
    }

    if (body.maxTokens !== undefined) {
      const n = Number(body.maxTokens)
      if (!Number.isFinite(n) || n < 64 || n > 4096) {
        throw createError({ statusCode: 400, statusMessage: 'maxTokens must be between 64 and 4096' })
      }
      updates.maxTokens = Math.round(n)
    }

    const settings = await db.saveAiSettings(updates)
    const keyConfigured = !!(useRuntimeConfig().geminiApiKey || '').trim()
    return { success: true, settings: { ...settings, keyConfigured } }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update AI settings: ${error.message}`
    })
  }
})
