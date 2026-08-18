import { db } from '../../../utils/db'
import { decryptToken } from '../../../utils/crypto'
import { sendTelegramMessage, sendTelegramSticker, sendTelegramPhotoUpload, sendTelegramVideoUpload } from '../../../utils/telegram'

// Avoid relying on a global File constructor: older Worker compatibility
// runtimes expose multipart files as File-like values without that global.
function isUploadedFile(value: unknown): value is File {
  return !!value && typeof value === 'object' &&
    typeof (value as File).arrayBuffer === 'function' &&
    typeof (value as File).name === 'string' &&
    typeof (value as File).size === 'number'
}

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

  const isMultipart = getHeader(event, 'content-type')?.includes('multipart/form-data')
  const form = isMultipart ? await event.request.formData() : null
  const body = form ? Object.fromEntries(form.entries()) : await readBody(event)
  const text = typeof body?.message === 'string' ? body.message.trim() : ''
  const stickerFileId = typeof body?.stickerFileId === 'string' ? body.stickerFileId.trim() : ''
  const mediaType = body?.mediaType === 'photo' || body?.mediaType === 'video' ? body.mediaType : null
  const mediaFile = form?.get('media')
  const uploadedMedia = isUploadedFile(mediaFile) ? mediaFile : null
  if (!text && !stickerFileId && !(mediaType && uploadedMedia)) {
    throw createError({ statusCode: 400, statusMessage: 'Message, sticker, or media file is required' })
  }
  if (mediaType && !uploadedMedia) {
    throw createError({ statusCode: 400, statusMessage: 'Media file is required' })
  }
  if (uploadedMedia && uploadedMedia.size > (mediaType === 'video' ? 50 : 10) * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: `${mediaType === 'video' ? 'Videos' : 'Images'} must be ${mediaType === 'video' ? '50' : '10'} MB or smaller` })
  }

  const bot = await db.getBot()
  if (!bot) {
    throw createError({ statusCode: 404, statusMessage: 'No bot is configured' })
  }

  const parseMode = body.parseMode === 'MarkdownV2' ? 'MarkdownV2' : 'HTML'
  const replyToMessageId =
    typeof body.replyToMessageId === 'number' ? body.replyToMessageId : undefined

  let response: { message_id: number; photo?: Array<{ file_id: string }>; video?: { file_id: string; mime_type?: string } }
  try {
    const token = await decryptToken(bot.token)
    response = mediaType === 'photo' && uploadedMedia
      ? await sendTelegramPhotoUpload(token, group.chatId, uploadedMedia, uploadedMedia.name, text, replyToMessageId)
      : mediaType === 'video' && uploadedMedia
        ? await sendTelegramVideoUpload(token, group.chatId, uploadedMedia, uploadedMedia.name, text, replyToMessageId)
      : stickerFileId
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
      : {}),
    ...(mediaType === 'photo' && response.photo?.length
      ? { mediaType: 'photo' as const, mediaFileId: response.photo[response.photo.length - 1].file_id }
      : mediaType === 'video' && response.video
        ? { mediaType: 'video' as const, mediaFileId: response.video.file_id, mediaMime: response.video.mime_type, mediaFileName: uploadedMedia?.name }
        : {})
  })

  await db.createLog(group.id, group.name, null, text || (mediaType === 'photo' ? 'Photo' : mediaType === 'video' ? 'Video' : `${body?.stickerEmoji || ''} Sticker`.trim()), 'SUCCESS', null, response)

  return { success: true, message: stored }
})
