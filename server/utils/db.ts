import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// File paths
const DATA_DIR = path.resolve(process.cwd(), 'data')
const BOTS_PATH = path.join(DATA_DIR, 'bots.json')
const GROUPS_PATH = path.join(DATA_DIR, 'groups.json')
const SCHEDULES_PATH = path.join(DATA_DIR, 'schedules.json')
const LOGS_PATH = path.join(DATA_DIR, 'logs.json')
const QUEUE_PATH = path.join(DATA_DIR, 'queue.json')

// Interfaces
export interface JSONBot {
  id: number
  token: string // Encrypted token
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

export interface JSONGroup {
  id: number
  name: string
  chatId: string
  active: boolean
  type: 'group' | 'channel' | 'supergroup' | 'private'
  botId: number | null // Associated bot (optional)
  isAdmin?: boolean
  permissionsVerified?: boolean
  createdAt: string
}

export interface JSONSchedule {
  id: number
  title: string
  type: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'cron'
  time: string // HH:MM or Cron expression
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
  timezone: string // e.g. "Asia/Phnom_Penh"
  message: string
  messageType: 'text' | 'photo' | 'video' | 'document'
  mediaUrl?: string
  parseMode: 'HTML' | 'MarkdownV2'
  botId: number // ID of bot that will send it
  active: boolean
  createdAt: string
  lastExecutedAt?: string
}

export interface QueueItem {
  id: string
  botId: number
  chatId: string
  message: string
  messageType: 'text' | 'photo' | 'video' | 'document'
  mediaUrl?: string
  parseMode: 'HTML' | 'MarkdownV2'
  scheduleId: number | null
  status: 'PENDING' | 'RETRYING' | 'FAILED'
  attempts: number
  maxAttempts: number
  nextAttemptAt: string // ISO date
  createdAt: string
  error?: string | null
}

export interface JSONLog {
  id: string
  botId: number
  groupId: number | null
  chatTitle: string
  scheduleId: number | null
  message: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRYING' | 'CANCELLED'
  error: string | null
  sentAt: string // ISO date string
  telegramResponse?: any
}

// Utility to read JSON file helper
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data) as T
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return defaultValue
    }
    console.error(`Error reading file ${filePath}:`, error)
    return defaultValue
  }
}

// Utility to write JSON file helper (atomic write via temp file)
async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const tempPath = `${filePath}.tmp`
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error)
    try {
      await fs.unlink(tempPath)
    } catch {}
    throw error
  }
}

export const db = {
  // Migration support for old single bot
  async migrateOldBotIfNeeded(): Promise<void> {
    const oldBotPath = path.join(DATA_DIR, 'bot.json')
    try {
      const oldExists = await fs.stat(oldBotPath).then(() => true).catch(() => false)
      if (oldExists) {
        const oldBotData = await readJsonFile<{ token: string; username: string; active: boolean }>(oldBotPath, { token: '', username: '', active: true })
        if (oldBotData.token) {
          // Double-check if we already have bots inside BOTS_PATH to prevent double migration
          const bots = await readJsonFile<JSONBot[]>(BOTS_PATH, [])
          if (bots.length === 0) {
            console.log('[Migration] Migrating old bot.json token to bots.json...')
            const newBot: JSONBot = {
              id: 1,
              token: oldBotData.token,
              username: oldBotData.username || 'MigratedBot',
              firstName: oldBotData.username || 'Migrated Bot',
              active: oldBotData.active,
              permissions: { can_join_groups: true, can_read_all_group_messages: true, supports_inline_queries: false },
              status: 'ONLINE',
              createdAt: new Date().toISOString()
            }
            await writeJsonFile(BOTS_PATH, [newBot])
          }
        }
        // Remove old bot.json
        await fs.unlink(oldBotPath)
        console.log('[Migration] Cleaned up old bot.json.')
      }
    } catch (err) {
      console.error('[Migration] Failed to migrate old bot:', err)
    }
  },

  // Bot Management
  async getBots(): Promise<JSONBot[]> {
    await this.migrateOldBotIfNeeded()
    return readJsonFile<JSONBot[]>(BOTS_PATH, [])
  },

  async saveBots(bots: JSONBot[]): Promise<void> {
    await writeJsonFile(BOTS_PATH, bots)
  },

  async getBotById(id: number): Promise<JSONBot | null> {
    const bots = await this.getBots()
    return bots.find(b => b.id === id) || null
  },

  async createBot(
    token: string,
    username: string,
    firstName: string,
    permissions = { can_join_groups: true, can_read_all_group_messages: true, supports_inline_queries: false },
    active = true
  ): Promise<JSONBot> {
    const bots = await this.getBots()
    const nextId = bots.length > 0 ? Math.max(...bots.map(b => b.id)) + 1 : 1
    const newBot: JSONBot = {
      id: nextId,
      token,
      username,
      firstName,
      active,
      permissions,
      status: 'ONLINE',
      createdAt: new Date().toISOString()
    }
    bots.push(newBot)
    await this.saveBots(bots)
    return newBot
  },

  async updateBot(id: number, updates: Partial<Omit<JSONBot, 'id' | 'createdAt'>>): Promise<JSONBot> {
    const bots = await this.getBots()
    const index = bots.findIndex(b => b.id === id)
    if (index === -1) {
      throw new Error(`Bot with ID ${id} not found`)
    }
    const updatedBot = {
      ...bots[index],
      ...updates
    }
    bots[index] = updatedBot
    await this.saveBots(bots)
    return updatedBot
  },

  async deleteBot(id: number): Promise<boolean> {
    let bots = await this.getBots()
    const exists = bots.some(b => b.id === id)
    if (!exists) return false

    bots = bots.filter(b => b.id !== id)
    await this.saveBots(bots)

    // Cascade delete schedules associated with this bot
    let schedules = await this.getSchedules()
    schedules = schedules.filter(s => s.botId !== id)
    await this.saveSchedules(schedules)

    return true
  },

  // Group Management
  async getGroups(): Promise<JSONGroup[]> {
    return readJsonFile<JSONGroup[]>(GROUPS_PATH, [])
  },

  async saveGroups(groups: JSONGroup[]): Promise<void> {
    await writeJsonFile(GROUPS_PATH, groups)
  },

  async getGroupById(id: number): Promise<JSONGroup | null> {
    const groups = await this.getGroups()
    return groups.find(g => g.id === id) || null
  },

  async getGroupByChatId(chatId: string): Promise<JSONGroup | null> {
    const groups = await this.getGroups()
    return groups.find(g => g.chatId === chatId) || null
  },

  async createGroup(
    name: string,
    chatId: string,
    type: 'group' | 'channel' | 'supergroup' | 'private' = 'group',
    botId: number | null = null,
    active = true
  ): Promise<JSONGroup> {
    const groups = await this.getGroups()
    const nextId = groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1
    const newGroup: JSONGroup = {
      id: nextId,
      name,
      chatId,
      active,
      type,
      botId,
      createdAt: new Date().toISOString()
    }
    groups.push(newGroup)
    await this.saveGroups(groups)
    return newGroup
  },

  async updateGroup(id: number, updates: Partial<Omit<JSONGroup, 'id' | 'createdAt'>>): Promise<JSONGroup> {
    const groups = await this.getGroups()
    const index = groups.findIndex(g => g.id === id)
    if (index === -1) {
      throw new Error(`Group with ID ${id} not found`)
    }
    const updatedGroup = {
      ...groups[index],
      ...updates
    }
    groups[index] = updatedGroup
    await this.saveGroups(groups)
    return updatedGroup
  },

  async deleteGroup(id: number): Promise<boolean> {
    let groups = await this.getGroups()
    const exists = groups.some(g => g.id === id)
    if (!exists) return false

    groups = groups.filter(g => g.id !== id)
    await this.saveGroups(groups)

    // Cascade delete logs associated with this group
    let logs = await this.getLogs()
    logs = logs.filter(l => l.groupId !== id)
    await this.saveLogs(logs)

    return true
  },

  // Schedule Management
  async getSchedules(): Promise<JSONSchedule[]> {
    return readJsonFile<JSONSchedule[]>(SCHEDULES_PATH, [])
  },

  async saveSchedules(schedules: JSONSchedule[]): Promise<void> {
    await writeJsonFile(SCHEDULES_PATH, schedules)
  },

  async getScheduleById(id: number): Promise<JSONSchedule | null> {
    const schedules = await this.getSchedules()
    return schedules.find(s => s.id === id) || null
  },

  async createSchedule(
    title: string,
    message: string,
    time: string,
    type: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'cron' = 'daily',
    timezone = 'Asia/Phnom_Penh',
    botId: number,
    messageType: 'text' | 'photo' | 'video' | 'document' = 'text',
    mediaUrl = '',
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML',
    options?: { dayOfWeek?: number; dayOfMonth?: number },
    active = true
  ): Promise<JSONSchedule> {
    const schedules = await this.getSchedules()
    const nextId = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1
    const newSchedule: JSONSchedule = {
      id: nextId,
      title,
      type,
      time,
      timezone,
      message,
      messageType,
      mediaUrl: mediaUrl || undefined,
      parseMode,
      botId,
      active,
      dayOfWeek: options?.dayOfWeek,
      dayOfMonth: options?.dayOfMonth,
      createdAt: new Date().toISOString()
    }
    schedules.push(newSchedule)
    await this.saveSchedules(schedules)
    return newSchedule
  },

  async updateSchedule(id: number, updates: Partial<Omit<JSONSchedule, 'id' | 'createdAt'>>): Promise<JSONSchedule> {
    const schedules = await this.getSchedules()
    const index = schedules.findIndex(s => s.id === id)
    if (index === -1) {
      throw new Error(`Schedule with ID ${id} not found`)
    }
    const updatedSchedule = {
      ...schedules[index],
      ...updates
    }
    schedules[index] = updatedSchedule
    await this.saveSchedules(schedules)
    return updatedSchedule
  },

  async deleteSchedule(id: number): Promise<boolean> {
    let schedules = await this.getSchedules()
    const exists = schedules.some(s => s.id === id)
    if (!exists) return false

    schedules = schedules.filter(s => s.id !== id)
    await this.saveSchedules(schedules)

    // Set scheduleId to null for logs associated with this schedule
    let logs = await this.getLogs()
    let logUpdated = false
    logs = logs.map(l => {
      if (l.scheduleId === id) {
        logUpdated = true
        return { ...l, scheduleId: null }
      }
      return l
    })
    if (logUpdated) {
      await this.saveLogs(logs)
    }

    return true
  },

  // Queue Management
  async getQueue(): Promise<QueueItem[]> {
    return readJsonFile<QueueItem[]>(QUEUE_PATH, [])
  },

  async saveQueue(queue: QueueItem[]): Promise<void> {
    await writeJsonFile(QUEUE_PATH, queue)
  },

  async createQueueItem(
    botId: number,
    chatId: string,
    message: string,
    messageType: 'text' | 'photo' | 'video' | 'document' = 'text',
    mediaUrl = '',
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML',
    scheduleId: number | null = null,
    maxAttempts = 3
  ): Promise<QueueItem> {
    const queue = await this.getQueue()
    const newItem: QueueItem = {
      id: crypto.randomUUID(),
      botId,
      chatId,
      message,
      messageType,
      mediaUrl: mediaUrl || undefined,
      parseMode,
      scheduleId,
      status: 'PENDING',
      attempts: 0,
      maxAttempts,
      nextAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      error: null
    }
    queue.push(newItem)
    await this.saveQueue(queue)
    return newItem
  },

  async updateQueueItem(id: string, updates: Partial<QueueItem>): Promise<QueueItem> {
    const queue = await this.getQueue()
    const index = queue.findIndex(q => q.id === id)
    if (index === -1) {
      throw new Error(`Queue item with ID ${id} not found`)
    }
    const updated = {
      ...queue[index],
      ...updates
    }
    queue[index] = updated
    await this.saveQueue(queue)
    return updated
  },

  async deleteQueueItem(id: string): Promise<boolean> {
    let queue = await this.getQueue()
    const exists = queue.some(q => q.id === id)
    if (!exists) return false
    queue = queue.filter(q => q.id !== id)
    await this.saveQueue(queue)
    return true
  },

  // Message Logs
  async getLogs(): Promise<JSONLog[]> {
    return readJsonFile<JSONLog[]>(LOGS_PATH, [])
  },

  async saveLogs(logs: JSONLog[]): Promise<void> {
    await writeJsonFile(LOGS_PATH, logs)
  },

  async createLog(
    botId: number,
    groupId: number | null,
    chatTitle: string,
    scheduleId: number | null,
    message: string,
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'RETRYING' | 'CANCELLED',
    error: string | null = null,
    telegramResponse: any = null
  ): Promise<JSONLog> {
    const logs = await this.getLogs()
    const newLog: JSONLog = {
      id: crypto.randomUUID(),
      botId,
      groupId,
      chatTitle,
      scheduleId,
      message,
      status,
      error,
      sentAt: new Date().toISOString(),
      telegramResponse
    }
    logs.push(newLog)

    // Cap logs at 1000 to avoid file growing indefinitely
    if (logs.length > 1000) {
      logs.shift()
    }

    await this.saveLogs(logs)
    return newLog
  }
}
