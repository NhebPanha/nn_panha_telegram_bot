import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const groups = await db.getGroups()
    const logs = await db.getLogs()

    // Map each group to format expected by UI, sorting by ID desc to show newest first
    const sortedGroups = [...groups].sort((a, b) => b.id - a.id)

    return sortedGroups.map(g => {
      const groupLogs = logs
        .filter(l => l.groupId === g.id)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

      return {
        id: String(g.id),
        chatId: g.chatId,
        name: g.name,
        isActive: g.active,
        createdAt: new Date().toISOString(),
        lastMessageTime: groupLogs[0]?.sentAt || null
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch groups: ${error.message}`
    })
  }
})
