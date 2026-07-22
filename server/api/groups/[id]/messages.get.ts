import { db } from '../../../utils/db'

/**
 * Return the stored conversation history for a group (Telegram-style chat view).
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

  const limitRaw = Number(getQuery(event).limit)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 200

  const messages = await db.getChatMessagesByChatId(group.chatId, limit)

  return {
    groupId: String(group.id),
    chatId: group.chatId,
    name: group.name,
    messages
  }
})
