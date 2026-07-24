export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
}

export interface TelegramChatInfo {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramMessageEntity {
  type: string // 'url' | 'text_link' | 'mention' | 'text_mention' | ...
  offset: number
  length: number
  url?: string
  user?: { id: number; is_bot?: boolean; first_name?: string; username?: string } // for 'text_mention'
}

export interface TelegramDocument {
  file_id: string
  file_unique_id?: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramIncomingMessage {
  message_id: number
  from?: {
    id: number
    is_bot: boolean
    first_name?: string
    last_name?: string
    username?: string
  }
  chat: {
    id: number
    type: 'private' | 'group' | 'supergroup' | 'channel'
    title?: string
    username?: string
  }
  date: number
  text?: string
  caption?: string
  entities?: TelegramMessageEntity[]
  caption_entities?: TelegramMessageEntity[]
  sticker?: {
    file_id: string
    emoji?: string
    set_name?: string
  }
  document?: TelegramDocument
  reply_to_message?: TelegramIncomingMessage
}

export interface TelegramChatMemberUpdated {
  chat: {
    id: number
    type: 'private' | 'group' | 'supergroup' | 'channel'
    title?: string
    username?: string
  }
  new_chat_member?: {
    status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
  }
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramIncomingMessage
  edited_message?: TelegramIncomingMessage
  channel_post?: TelegramIncomingMessage
  edited_channel_post?: TelegramIncomingMessage
  my_chat_member?: TelegramChatMemberUpdated
}

// Remove any webhook so long polling (getUpdates) is allowed. This app uses
// polling, so it's safe to clear a stale webhook on startup.
export async function deleteTelegramWebhook(token: string): Promise<boolean> {
  try {
    const response = await $fetch<{ ok: boolean }>(
      `https://api.telegram.org/bot${token}/deleteWebhook`,
      { method: 'POST', body: { drop_pending_updates: false } }
    )
    return response.ok
  } catch {
    return false
  }
}

export interface TelegramWebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  last_error_message?: string
  last_error_date?: number
}

// Register a webhook so Telegram pushes updates to us (Workers cannot long-poll).
export async function setTelegramWebhook(
  token: string,
  url: string,
  secretToken: string
): Promise<boolean> {
  const response = await $fetch<{ ok: boolean; description?: string }>(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: 'POST',
      body: {
        url,
        secret_token: secretToken,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'my_chat_member'],
        drop_pending_updates: false
      }
    }
  )
  if (!response.ok) {
    throw new Error(response.description || 'Telegram setWebhook responded with ok: false')
  }
  return true
}

export async function getTelegramWebhookInfo(token: string): Promise<TelegramWebhookInfo> {
  const response = await $fetch<{ ok: boolean; result: TelegramWebhookInfo; description?: string }>(
    `https://api.telegram.org/bot${token}/getWebhookInfo`,
    { method: 'GET' }
  )
  if (!response.ok) {
    throw new Error(response.description || 'Telegram getWebhookInfo responded with ok: false')
  }
  return response.result
}

// Long-poll for incoming updates. `timeout` is the server-side long-poll
// window in seconds; the HTTP client timeout is set slightly higher.
export async function getTelegramUpdates(
  token: string,
  offset: number,
  timeout = 25
): Promise<TelegramUpdate[]> {
  const response = await $fetch<{ ok: boolean; result: TelegramUpdate[]; description?: string }>(
    `https://api.telegram.org/bot${token}/getUpdates`,
    {
      method: 'POST',
      body: {
        offset,
        timeout,
        allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post', 'my_chat_member']
      },
      timeout: (timeout + 10) * 1000
    }
  )
  if (!response.ok) {
    throw new Error(response.description || 'Telegram getUpdates responded with ok: false')
  }
  return response.result
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name?: string
  last_name?: string
  username?: string
}

export interface TelegramChatMember {
  user: TelegramUser
  status: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
}

// Fetch the administrators of a chat. This is the only member-listing endpoint
// the Bot API exposes (bots cannot enumerate the full member list of a group).
export async function getChatAdministrators(token: string, chatId: string): Promise<TelegramChatMember[]> {
  try {
    const response = await $fetch<{ ok: boolean; result: TelegramChatMember[] }>(
      `https://api.telegram.org/bot${token}/getChatAdministrators`,
      { method: 'POST', body: { chat_id: chatId } }
    )
    if (!response.ok) throw new Error('Telegram API responded with ok: false')
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram getChatAdministrators Failed: ${message}`)
  }
}

// Look up a single member's status in a chat (used to authorize commands).
export async function getChatMember(token: string, chatId: string, userId: number): Promise<TelegramChatMember> {
  try {
    const response = await $fetch<{ ok: boolean; result: TelegramChatMember }>(
      `https://api.telegram.org/bot${token}/getChatMember`,
      { method: 'POST', body: { chat_id: chatId, user_id: userId } }
    )
    if (!response.ok) throw new Error('Telegram API responded with ok: false')
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram getChatMember Failed: ${message}`)
  }
}

// Total member count of a chat (a plain number; no per-user detail).
export async function getChatMemberCount(token: string, chatId: string): Promise<number> {
  try {
    const response = await $fetch<{ ok: boolean; result: number }>(
      `https://api.telegram.org/bot${token}/getChatMemberCount`,
      { method: 'POST', body: { chat_id: chatId } }
    )
    if (!response.ok) throw new Error('Telegram API responded with ok: false')
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram getChatMemberCount Failed: ${message}`)
  }
}

export async function verifyTelegramBot(token: string): Promise<TelegramBotInfo> {
  try {
    const response = await $fetch<{ ok: boolean; result: TelegramBotInfo }>(
      `https://api.telegram.org/bot${token}/getMe`,
      { method: 'GET' }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Verification Failed: ${message}`)
  }
}

export async function getChatInfo(token: string, chatId: string): Promise<TelegramChatInfo> {
  try {
    // Normalise chatId (sometimes group IDs can be passed as strings, but channels are @channel)
    const formattedChatId = chatId.startsWith('@') || chatId.match(/^-?\d+$/) ? chatId : `@${chatId}`
    const response = await $fetch<{ ok: boolean; result: TelegramChatInfo }>(
      `https://api.telegram.org/bot${token}/getChat`,
      {
        method: 'POST',
        body: { chat_id: formattedChatId }
      }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram getChat Failed: ${message}`)
  }
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML',
  replyToMessageId?: number
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
          // reply_parameters is the current API; allow_sending_without_reply
          // avoids an error if the target message was already deleted.
          ...(replyToMessageId
            ? { reply_parameters: { message_id: replyToMessageId, allow_sending_without_reply: true } }
            : {})
        }
      }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Send Message Failed: ${message}`)
  }
}

export async function sendTelegramPhoto(
  token: string,
  chatId: string,
  photoUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          photo: photoUrl,
          caption: caption,
          parse_mode: parseMode
        }
      }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Send Photo Failed: ${message}`)
  }
}

export async function sendTelegramVideo(
  token: string,
  chatId: string,
  videoUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendVideo`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          video: videoUrl,
          caption: caption,
          parse_mode: parseMode
        }
      }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Send Video Failed: ${message}`)
  }
}

export async function sendTelegramDocument(
  token: string,
  chatId: string,
  documentUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendDocument`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          document: documentUrl,
          caption: caption,
          parse_mode: parseMode
        }
      }
    )
    if (!response.ok) {
      throw new Error('Telegram API responded with ok: false')
    }
    return response.result
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Send Document Failed: ${message}`)
  }
}

export async function pinChatMessage(
  token: string,
  chatId: string,
  messageId: number
): Promise<boolean> {
  try {
    const response = await $fetch<{ ok: boolean; result: boolean }>(
      `https://api.telegram.org/bot${token}/pinChatMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          message_id: messageId,
          disable_notification: false
        }
      }
    )
    return response.ok
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Pin Message Failed: ${message}`)
  }
}

export async function unpinChatMessage(
  token: string,
  chatId: string,
  messageId?: number
): Promise<boolean> {
  try {
    const response = await $fetch<{ ok: boolean; result: boolean }>(
      `https://api.telegram.org/bot${token}/unpinChatMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          message_id: messageId
        }
      }
    )
    return response.ok
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Unpin Message Failed: ${message}`)
  }
}

export async function deleteMessage(
  token: string,
  chatId: string,
  messageId: number
): Promise<boolean> {
  try {
    const response = await $fetch<{ ok: boolean; result: boolean }>(
      `https://api.telegram.org/bot${token}/deleteMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          message_id: messageId
        }
      }
    )
    return response.ok
  } catch (error: any) {
    const message = error.data?.description || error.message || 'Unknown error'
    throw new Error(`Telegram Delete Message Failed: ${message}`)
  }
}
