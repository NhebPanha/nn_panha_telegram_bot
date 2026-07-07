import { prisma } from '../../utils/prisma'

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

    // Validate that Chat ID starts with a minus sign
    if (!chatId.startsWith('-')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid Chat ID. Telegram group IDs start with a minus sign (-), e.g. -100123456789'
      })
    }

    // Check if group already exists
    const existingGroup = await prisma.telegramGroup.findUnique({
      where: { chatId }
    })

    if (existingGroup) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A group with this Chat ID already exists'
      })
    }

    const group = await prisma.telegramGroup.create({
      data: {
        chatId,
        name,
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    })

    return {
      success: true,
      group
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Failed to create group: ${error.message}`
    })
  }
})
