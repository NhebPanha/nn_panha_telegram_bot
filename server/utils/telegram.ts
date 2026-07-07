export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  can_join_groups: boolean
  can_read_all_group_messages: boolean
  supports_inline_queries: boolean
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

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
): Promise<{ message_id: number }> {
  try {
    const response = await $fetch<{ ok: boolean; result: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        body: {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
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
