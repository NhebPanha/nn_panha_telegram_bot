import { defineStore } from 'pinia'

export interface NextScheduleInfo {
  id: string
  title: string
  time: string
  message: string
  execTime: string
  minutesLeft: number
}

export interface DashboardStats {
  totalGroups: number
  activeSchedules: number
  sentToday: number
  failedToday: number
  nextSchedule: NextScheduleInfo | null
}

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    stats: {
      totalGroups: 0,
      activeSchedules: 0,
      sentToday: 0,
      failedToday: 0,
      nextSchedule: null
    } as DashboardStats,
    isLoading: false
  }),

  actions: {
    async fetchStats() {
      this.isLoading = true
      try {
        const data = await $fetch<DashboardStats>('/api/dashboard/stats')
        this.stats = data
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        this.isLoading = false
      }
    }
  }
})
