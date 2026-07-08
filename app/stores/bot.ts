import { defineStore } from 'pinia'

export interface BotInfo {
  id: number
  username: string
  firstName: string
  active: boolean
  permissions: {
    can_join_groups: boolean
    can_read_all_group_messages: boolean
    supports_inline_queries: boolean
  }
  status: 'ONLINE' | 'OFFLINE'
  createdAt: string
}

export const useBotStore = defineStore('bot', {
  state: () => ({
    bots: [] as BotInfo[],
    isLoading: false
  }),

  getters: {
    activeBots: (state) => state.bots.filter(b => b.active)
  },

  actions: {
    async fetchBots() {
      this.isLoading = true
      try {
        const data = await $fetch<BotInfo[]>('/api/bots')
        this.bots = data
      } catch (error) {
        console.error('Failed to fetch bot settings list:', error)
      } finally {
        this.isLoading = false
      }
    },

    async addBot(token: string) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; bot: BotInfo }>('/api/bots', {
          method: 'POST',
          body: { token }
        })
        if (data.success) {
          await this.fetchBots()
        }
        return data
      } finally {
        this.isLoading = false
      }
    },

    async toggleBotStatus(id: number, active: boolean) {
      try {
        const data = await $fetch<{ success: boolean; bot: BotInfo }>(`/api/bots/${id}`, {
          method: 'PUT',
          body: { active }
        })
        if (data.success) {
          const index = this.bots.findIndex(b => b.id === id)
          if (index !== -1) {
            this.bots[index].active = data.bot.active
          }
        }
        return data
      } catch (error) {
        console.error(`Failed to toggle status for bot ${id}:`, error)
        throw error
      }
    },

    async deleteBot(id: number) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean }>(`/api/bots/${id}`, {
          method: 'DELETE'
        })
        if (data.success) {
          this.bots = this.bots.filter(b => b.id !== id)
        }
        return data
      } finally {
        this.isLoading = false
      }
    },

    async verifyBot(id: number) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; status: 'ONLINE' | 'OFFLINE'; bot: BotInfo }>('/api/bots/verify', {
          method: 'POST',
          body: { id }
        })
        if (data.bot) {
          const index = this.bots.findIndex(b => b.id === id)
          if (index !== -1) {
            this.bots[index] = data.bot
          }
        }
        return data
      } finally {
        this.isLoading = false
      }
    },

    async testMessage(botId: number, chatId: string, message: string) {
      this.isLoading = true
      try {
        const data = await $fetch<{ success: boolean; log: any }>('/api/bots/test', {
          method: 'POST',
          body: { botId, chatId, message }
        })
        return data
      } finally {
        this.isLoading = false
      }
    }
  }
})
