import { db } from '../../utils/db'

export default defineEventHandler(async () => {
  try {
    const groups = await db.getGroups()
    const logs = await db.getLogs()

    // Map each group to format expected by UI, sorting by ID desc
    const sortedGroups = [...groups].sort((a, b) => b.id - a.id)

    return sortedGroups.map(g => {
      // Find logs associated with this group
      const groupLogs = logs
        .filter(l => l.groupId === g.id || (l.groupId === null && l.chatTitle.includes(g.chatId)))
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

      return {
        id: String(g.id),
        chatId: g.chatId,
        name: g.name,
        isActive: g.active,
        type: g.type || 'group',
        isAdmin: g.isAdmin || false,
        permissionsVerified: g.permissionsVerified || false,
        createdAt: g.createdAt || new Date().toISOString(),
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
