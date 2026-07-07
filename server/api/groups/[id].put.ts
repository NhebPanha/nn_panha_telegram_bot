import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Group ID is required'
      })
    }

    const body = await readBody(event)
    if (!body) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body is required'
      })
    }

    const group = await prisma.telegramGroup.findUnique({
      where: { id }
    })

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
        const duplicate = await prisma.telegramGroup.findUnique({
          where: { chatId }
        })
        if (duplicate) {
          throw createError({
            statusCode: 409,
            statusMessage: 'A group with this Chat ID already exists'
          })
        }
      }
    }

    const updatedGroup = await prisma.telegramGroup.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : group.name,
        chatId,
        isActive: body.isActive !== undefined ? body.isActive : group.isActive
      }
    })

    return {
      success: true,
      group: updatedGroup
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to update group: ${error.message}`
    })
  }
})
