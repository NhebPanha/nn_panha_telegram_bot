import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const idStr = getRouterParam(event, 'id')
    if (!idStr) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID is required'
      })
    }

    const id = Number(idStr)
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Group ID format'
      })
    }

    const body = await readBody(event)
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body is required'
      })
    }

    const group = await db.getGroupById(id)
    if (!group) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Group not found'
      })
    }

    const updates: any = {}

    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.type !== undefined) updates.type = body.type
    if (body.isActive !== undefined) updates.active = !!body.isActive
    if (body.botId !== undefined) {
      updates.botId = body.botId ? parseInt(body.botId, 10) : null
    }

    let chatId = group.chatId
    if (body.chatId) {
      chatId = body.chatId.trim()

      if (chatId !== group.chatId) {
        const duplicate = await db.getGroupByChatId(chatId)
        if (duplicate) {
          throw createError({
            statusCode: 409,
            statusMessage: 'A group with this Chat ID already exists'
          })
        }
      }
      updates.chatId = chatId
    }

    const updatedGroup = await db.updateGroup(id, updates)

    return {
      success: true,
      group: {
        id: String(updatedGroup.id),
        chatId: updatedGroup.chatId,
        name: updatedGroup.name,
        isActive: updatedGroup.active,
        type: updatedGroup.type || 'group',
        botId: updatedGroup.botId,
        isAdmin: updatedGroup.isAdmin || false,
        permissionsVerified: updatedGroup.permissionsVerified || false,
        createdAt: updatedGroup.createdAt || new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update group: ${error.message}`
    })
  }
})
