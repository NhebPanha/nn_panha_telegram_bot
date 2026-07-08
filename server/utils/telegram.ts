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
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          text: text,
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
