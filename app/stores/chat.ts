import { defineStore } from 'pinia'

export interface ChatMember {
  chatId: string
  userId: number
  firstName?: string
  lastName?: string
  username?: string
  isBot: boolean
  status?: 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
  messageCount: number
  firstSeen: string
  lastSeen: string
}

export interface ChatMessage {
  id: string
  chatId: string
  messageId: number | null
  fromId: number | null
  fromName: string
  fromUsername?: string
  isBot: boolean
  direction: 'in' | 'out'
  text: string
  date: string
  replyToMessageId?: number | null
  replyToName?: string
  replyToText?: string
}

export interface ReplyTarget {
  messageId: number
  name: string
  text: string
}

interface MembersResponse {
  groupId: string
  chatId: string
  name: string
  totalCount: number | null
  knownCount: number
  adminError: string | null
  members: ChatMember[]
}

interface MessagesResponse {
  groupId: string
  chatId: string
  name: string
  messages: ChatMessage[]
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    members: [] as ChatMember[],
    totalCount: null as number | null,
    adminError: null as string | null,
    isLoadingMessages: false,
    isLoadingMembers: false,
    isSending: false
  }),

  actions: {
    async fetchMessages(groupId: string) {
      this.isLoadingMessages = true
      try {
        const data = await $fetch<MessagesResponse>(`/api/groups/${groupId}/messages`)
        this.messages = data.messages
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        this.isLoadingMessages = false
      }
    },

    async fetchMembers(groupId: string) {
      this.isLoadingMembers = true
      try {
        const data = await $fetch<MembersResponse>(`/api/groups/${groupId}/members`)
        this.members = data.members
        this.totalCount = data.totalCount
        this.adminError = data.adminError
      } catch (error) {
        console.error('Failed to fetch members:', error)
      } finally {
        this.isLoadingMembers = false
      }
    },

    async sendMessage(
      groupId: string,
      message: string,
      replyTo?: ReplyTarget | null,
      parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
    ) {
      this.isSending = true
      try {
        const data = await $fetch<{ success: boolean; message: ChatMessage }>(
          `/api/groups/${groupId}/messages`,
          {
            method: 'POST',
            body: {
              message,
              parseMode,
              replyToMessageId: replyTo?.messageId,
              replyToName: replyTo?.name,
              replyToText: replyTo?.text
            }
          }
        )
        if (data.success) {
          this.messages.push(data.message)
        }
        return data
      } finally {
        this.isSending = false
      }
    },

    reset() {
      this.messages = []
      this.members = []
      this.totalCount = null
      this.adminError = null
    }
  }
})
