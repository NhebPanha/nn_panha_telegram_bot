import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.chatId || !body.name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Chat ID and Group Name are required'
      })
    }

    const chatId = body.chatId.trim()
    const name = body.name.trim()

    // Validate that Chat ID starts with a minus sign or @ symbol
    if (!chatId.startsWith('-') && !chatId.startsWith('@')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Chat ID. Telegram group IDs start with a minus sign (-) or public usernames start with (@), e.g. -100123456789 or @my_channel'
      })
    }

    // Check if group already exists
    const existingGroup = await db.getGroupByChatId(chatId)
    if (existingGroup) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A group with this Chat ID already exists'
      })
    }

    const group = await db.createGroup(
      name,
      chatId,
      body.isActive !== undefined ? body.isActive : true
    )

    return {
      success: true,
      group: {
        id: String(group.id),
        chatId: group.chatId,
        name: group.name,
        isActive: group.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to create group: ${error.message}`
    })
  }
})
