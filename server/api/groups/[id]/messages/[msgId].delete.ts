import { db } from '../../../../utils/db'
import { decryptToken } from '../../../../utils/crypto'
import { deleteMessage } from '../../../../utils/telegram'

/**
 * Delete a message from the group (and from stored history).
 * `msgId` is the Telegram message_id. The bot can always delete its own
 * messages; deleting another member's message requires the bot to be an admin
 * with the "delete messages" permission.
 */
export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const msgIdStr = getRouterParam(event, 'msgId')
  const id = Number(idStr)
  const msgId = Number(msgIdStr)

  if (!idStr || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Group ID' })
  }
  if (!msgIdStr || isNaN(msgId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Message ID' })
  }

  const group = await db.getGroupById(id)
  if (!group) {
    throw createError({ statusCode: 404, statusMessage: 'Group not found' })
  }

  const bot = await db.getBot()
  if (!bot) {
    throw createError({ statusCode: 404, statusMessage: 'No bot is configured' })
  }

  // Try to delete on Telegram. If Telegram rejects it (too old, no permission),
  // surface the error and keep the local copy so the UI stays truthful.
  try {
    const token = await decryptToken(bot.token)
    await deleteMessage(token, group.chatId, msgId)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to delete message: ${err.message}`
    })
  }

  // Remove every stored copy of this message from the group's history.
  const messages = await db.getChatMessages()
  const remaining = messages.filter(m => !(m.chatId === group.chatId && m.messageId === msgId))
  if (remaining.length !== messages.length) {
    await db.saveChatMessages(remaining)
  }

  await db.createLog(group.id, group.name, null, `🗑️ Deleted message #${msgId} from dashboard`, 'SUCCESS', null, null)

  return { success: true, deletedMessageId: msgId }
})
