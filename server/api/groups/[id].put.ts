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

    let chatId = group.chatId
    if (body.chatId) {
      chatId = body.chatId.trim()
      if (!chatId.startsWith('-')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid Chat ID. Telegram group IDs start with a minus sign (-)'
        })
      }

      if (chatId !== group.chatId) {
        const duplicate = await db.getGroupByChatId(chatId)
        if (duplicate) {
          throw createError({
            statusCode: 409,
            statusMessage: 'A group with this Chat ID already exists'
          })
        }
      }
    }

    const updatedGroup = await db.updateGroup(id, {
      name: body.name !== undefined ? body.name.trim() : group.name,
      chatId,
      active: body.isActive !== undefined ? body.isActive : group.active
    })

    return {
      success: true,
      group: {
        id: String(updatedGroup.id),
        chatId: updatedGroup.chatId,
        name: updatedGroup.name,
        isActive: updatedGroup.active,
        createdAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update group: ${error.message}`
    })
  }
})
