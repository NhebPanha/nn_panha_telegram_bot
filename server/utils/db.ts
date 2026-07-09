import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// File paths
const DATA_DIR = path.resolve(process.cwd(), 'data')
const BOT_PATH = path.join(DATA_DIR, 'bot.json')
const GROUPS_PATH = path.join(DATA_DIR, 'groups.json')
const SCHEDULES_PATH = path.join(DATA_DIR, 'schedules.json')
const LOGS_PATH = path.join(DATA_DIR, 'logs.json')
const MODERATION_PATH = path.join(DATA_DIR, 'moderation.json')

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
  active: boolean
  createdAt: string
  lastExecutedAt?: string
}

export interface ModerationSettings {
  enabled: boolean
  deleteLinks: boolean
  deleteStickers: boolean
}

export interface JSONLog {
  id: string
  groupId: number | null
  chatTitle: string
  scheduleId: number | null
  message: string
  status: 'SUCCESS' | 'FAILED'
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
  // Migrate a legacy multi-bot bots.json (array) down to a single bot.json
  async migrateLegacyBotsIfNeeded(): Promise<void> {
    const legacyPath = path.join(DATA_DIR, 'bots.json')
    try {
      const legacyExists = await fs.stat(legacyPath).then(() => true).catch(() => false)
      if (!legacyExists) return

      // Only migrate if a single bot.json is not already present
      const currentExists = await fs.stat(BOT_PATH).then(() => true).catch(() => false)
      if (!currentExists) {
        const legacyBots = await readJsonFile<JSONBot[]>(legacyPath, [])
        if (Array.isArray(legacyBots) && legacyBots.length > 0) {
          console.log('[Migration] Converting legacy bots.json (multi-bot) to single bot.json...')
          const primary = { ...legacyBots[0], id: 1 }
          await writeJsonFile(BOT_PATH, primary)
        }
      }

      await fs.unlink(legacyPath)
      console.log('[Migration] Removed legacy bots.json.')
    } catch (err) {
      console.error('[Migration] Failed to migrate legacy bots.json:', err)
    }
  },

  // Bot Management (single bot)
  async getBot(): Promise<JSONBot | null> {
    await this.migrateLegacyBotsIfNeeded()
    return readJsonFile<JSONBot | null>(BOT_PATH, null)
  },

  async saveBot(bot: JSONBot): Promise<void> {
    await writeJsonFile(BOT_PATH, bot)
  },

  async setBot(
    token: string,
    username: string,
    firstName: string,
    permissions = { can_join_groups: true, can_read_all_group_messages: true, supports_inline_queries: false },
    active = true
  ): Promise<JSONBot> {
    const bot: JSONBot = {
      id: 1,
      token,
      username,
      firstName,
      active,
      permissions,
      status: 'ONLINE',
      createdAt: new Date().toISOString()
    }
    await this.saveBot(bot)
    return bot
  },

  async updateBot(updates: Partial<Omit<JSONBot, 'id' | 'createdAt'>>): Promise<JSONBot> {
    const bot = await this.getBot()
    if (!bot) {
      throw new Error('No bot is configured')
    }
    const updated = { ...bot, ...updates }
    await this.saveBot(updated)
    return updated
  },

  async deleteBot(): Promise<boolean> {
    const bot = await this.getBot()
    if (!bot) return false
    try {
      await fs.unlink(BOT_PATH)
    } catch {}
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

  // Moderation Settings
  async getModerationSettings(): Promise<ModerationSettings> {
    return readJsonFile<ModerationSettings>(MODERATION_PATH, {
      enabled: false,
      deleteLinks: false,
      deleteStickers: false
    })
  },

  async saveModerationSettings(updates: Partial<ModerationSettings>): Promise<ModerationSettings> {
    const current = await this.getModerationSettings()
    const merged: ModerationSettings = { ...current, ...updates }
    await writeJsonFile(MODERATION_PATH, merged)
    return merged
  },

  // Message Logs
  async getLogs(): Promise<JSONLog[]> {
    return readJsonFile<JSONLog[]>(LOGS_PATH, [])
  },

  async saveLogs(logs: JSONLog[]): Promise<void> {
    await writeJsonFile(LOGS_PATH, logs)
  },

  async createLog(
    groupId: number | null,
    chatTitle: string,
    scheduleId: number | null,
    message: string,
    status: 'SUCCESS' | 'FAILED',
    error: string | null = null,
    telegramResponse: any = null
  ): Promise<JSONLog> {
    const logs = await this.getLogs()
    const newLog: JSONLog = {
      id: crypto.randomUUID(),
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
