import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  try {
    const groups = await prisma.telegramGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { sentAt: 'desc' },
          take: 1
        }
      }
    })

    return groups.map(g => ({
      id: g.id,
      chatId: g.chatId,
      name: g.name,
      isActive: g.isActive,
      createdAt: g.createdAt,
      lastMessageTime: g.logs[0]?.sentAt || null
    }))
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch groups: ${error.message}`
    })
  }
})
