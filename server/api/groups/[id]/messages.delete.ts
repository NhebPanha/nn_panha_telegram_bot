import { db } from '../../../utils/db'

/**
 * Clear a group's stored conversation history from the dashboard (like
 * Telegram's "Delete chat"). This only removes the locally stored copy — a bot
 * cannot wipe a group's history on Telegram's servers.
 */
export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const id = Number(idStr)
  if (!idStr || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Group ID' })
  }

  const group = await db.getGroupById(id)
  if (!group) {
    throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  }

  const messages = await db.getChatMessages()
  const remaining = messages.filter(m => m.chatId !== group.chatId)
  const removed = messages.length - remaining.length

  if (removed > 0) {
    await db.saveChatMessages(remaining)
  }

  await db.createLog(group.id, group.name, null, `🧹 Cleared chat history (${removed} messages) from dashboard`, 'SUCCESS', null, null)

  return { success: true, removed }
})
