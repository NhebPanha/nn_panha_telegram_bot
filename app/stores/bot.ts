import { defineStore } from 'pinia'

export interface BotState {
  id: string | null
  username: string | null
  isActive: boolean
  createdAt: string | null
  exists: boolean
  isLoading: boolean
}

export const useBotStore = defineStore('bot', {
  state: (): BotState => ({
    id: null,
    username: null,
    isActive: true,
    createdAt: null,
    exists: false,
    isLoading: false
  }),

  actions: {
    async fetchBot() {
      this.isLoading = true
      try {
        const data = await $fetch<{ exists: boolean; bot: any }>('/api/bot')
        this.exists = data.exists
        if (data.bot) {
          this.id = data.bot.id
          this.username = data.bot.username
          this.isActive = data.bot.isActive
          this.createdAt = data.bot.createdAt
        } else {
          this.clearBot()
        }
      } catch (error: any) {
        console.error('Failed to fetch bot settings:', error)
      } finally {
        this.isLoading = false
      }
    },

    async saveBotToken(token: string) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; bot: any }>('/api/bot', {
          method: 'POST',
          body: { token }
        })
        if (data.success && data.bot) {
          this.exists = true
          this.id = data.bot.id
          this.username = data.bot.username
          this.isActive = data.bot.isActive
          this.createdAt = data.bot.createdAt
        }
        return data
      } finally {
        this.isLoading = false
      }
    },

    async verifyBot() {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; bot: any }>('/api/bot/verify', {
          method: 'POST'
        })
        if (data.success && data.bot) {
          this.exists = true
          this.username = data.bot.username
          this.isActive = data.bot.isActive
        }
        return data
      } finally {
        this.isLoading = false
      }
    },

    async testMessage(chatId: string, message: string) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; log: any }>('/api/bot/test', {
          method: 'POST',
          body: { chatId, message }
        })
        return data
      } finally {
        this.isLoading = false
      }
    },

    clearBot() {
      this.id = null
      this.username = null
      this.isActive = true
      this.createdAt = null
      this.exists = false
    }
  }
})
