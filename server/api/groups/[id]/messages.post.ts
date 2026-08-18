import { db } from '../../../utils/db'
import { decryptToken } from '../../../utils/crypto'
import { sendTelegramMessage, sendTelegramSticker } from '../../../utils/telegram'

/**
 * Send a message to a group from the dashboard and store it in the chat
 * history as an outgoing message (Telegram-style chat view).
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

  const body = await readBody(event)
  const text = typeof body?.message === 'string' ? body.message.trim() : ''
  const stickerFileId = typeof body?.stickerFileId === 'string' ? body.stickerFileId.trim() : ''
  if (!text && !stickerFileId) {
    throw createError({ statusCode: 400, statusMessage: 'Message text or sticker is required' })
  }

  const bot = await db.getBot()
  if (!bot) {
    throw createError({ statusCode: 404, statusMessage: 'No bot is configured' })
  }

  const parseMode = body.parseMode === 'MarkdownV2' ? 'MarkdownV2' : 'HTML'
  const replyToMessageId =
    typeof body.replyToMessageId === 'number' ? body.replyToMessageId : undefined

  let response: { message_id: number }
  try {
    const token = await decryptToken(bot.token)
    response = stickerFileId
      ? await sendTelegramSticker(token, group.chatId, stickerFileId, replyToMessageId)
      : await sendTelegramMessage(token, group.chatId, text, parseMode, replyToMessageId)
  } catch (err: any) {
    await db.createLog(group.id, group.name, null, text, 'FAILED', err.message)
    throw createError({
      statusCode: 400,
      statusMessage: `Failed to send message: ${err.message}`
    })
  }

  const stored = await db.addChatMessage({
    chatId: group.chatId,
    messageId: response.message_id,
    fromId: null,
    fromName: bot.firstName || 'Bot',
    fromUsername: bot.username,
    isBot: true,
    direction: 'out',
    text,
    date: new Date().toISOString(),
    replyToMessageId: replyToMessageId ?? null,
    replyToName: typeof body.replyToName === 'string' ? body.replyToName : undefined,
    replyToText: typeof body.replyToText === 'string' ? body.replyToText : undefined,
    ...(stickerFileId
      ? {
          mediaType: 'sticker' as const,
          mediaFileId: stickerFileId,
          mediaEmoji: typeof body.stickerEmoji === 'string' ? body.stickerEmoji : undefined,
          stickerFormat: body.stickerFormat === 'video' || body.stickerFormat === 'animated'
            ? body.stickerFormat
            : 'static' as const
        }
      : {})
  })

  await db.createLog(group.id, group.name, null, text || `${body?.stickerEmoji || ''} Sticker`.trim(), 'SUCCESS', null, response)

  return { success: true, message: stored }
})
