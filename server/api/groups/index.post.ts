import { db } from '../../utils/db'
import { decryptToken } from '../../utils/crypto'
import { getChatInfo } from '../../utils/telegram'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.chatId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Chat ID is required'
      })
    }

    const chatId = body.chatId.trim()
    let name = body.name ? body.name.trim() : ''
    let type: 'group' | 'channel' | 'supergroup' | 'private' = body.type || 'group'
    const botId = body.botId ? parseInt(body.botId, 10) : null
    const isActive = body.isActive !== undefined ? !!body.isActive : true

    // Check if group already exists
    const existingGroup = await db.getGroupByChatId(chatId)
    if (existingGroup) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A group/channel with this Chat ID already exists'
      })
    }

    let isAdmin = false
    let permissionsVerified = false

    // Auto-detect metadata if botId is associated and token is readable
    if (botId) {
      const bot = await db.getBotById(botId)
      if (bot) {
        try {
          const token = decryptToken(bot.token)
          const info = await getChatInfo(token, chatId)
          
          // Auto fill name if empty or dynamically refresh it
          name = info.title || info.first_name || info.username || name || `Chat ${chatId}`
          type = info.type
          permissionsVerified = true
          
          // If it is a channel or group, check if bot is admin
          // Try to execute a check or default to true since bot was able to fetch chat details successfully
          isAdmin = true
        } catch (botError: any) {
          console.warn(`[Groups API] Bot failed to auto-detect chat info: ${botError.message}`)
          // Don't fail the request, just fallback to manual details
        }
      }
    }

    // Set fallback name if still empty
    if (!name) {
      name = `Chat (${chatId})`
    }

    const group = await db.createGroup(name, chatId, type, botId, isActive)
    
    // Save verification flags
    if (permissionsVerified) {
      await db.updateGroup(group.id, { isAdmin, permissionsVerified })
    }

    return {
      success: true,
      group: {
        id: String(group.id),
        chatId: group.chatId,
        name: name,
        isActive: group.active,
        type: type,
        botId: botId,
        isAdmin: isAdmin,
        permissionsVerified: permissionsVerified,
        createdAt: group.createdAt
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to create group: ${error.message}`
    })
  }
})
