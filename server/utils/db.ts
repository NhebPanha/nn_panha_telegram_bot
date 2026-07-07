import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// File paths
const DATA_DIR = path.resolve(process.cwd(), 'data')
const BOT_PATH = path.join(DATA_DIR, 'bot.json')
const GROUPS_PATH = path.join(DATA_DIR, 'groups.json')
const SCHEDULES_PATH = path.join(DATA_DIR, 'schedules.json')
const LOGS_PATH = path.join(DATA_DIR, 'logs.json')

// Interfaces matching bot.json, groups.json, schedules.json, logs.json
export interface JSONBot {
  token: string
  username: string
  active: boolean
}

export interface JSONGroup {
  id: number
  name: string
  chatId: string
  active: boolean
}

export interface JSONSchedule {
  id: number
  title: string
  time: string
  message: string
  active: boolean
}

export interface JSONLog {
  id: string
  groupId: number
  scheduleId: number | null
  message: string
  status: 'SUCCESS' | 'FAILED'
  error: string | null
  sentAt: string // ISO date string
}

// Utility to read JSON file helper
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data) as T
  } catch (error: any) {
    // If file doesn't exist, return default value
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
    // Clean up temp file if exists
    try {
      await fs.unlink(tempPath)
    } catch {}
    throw error
  }
}

export const db = {
  // Bot Settings
  async getBot(): Promise<JSONBot> {
    return readJsonFile<JSONBot>(BOT_PATH, { token: '', username: '', active: true })
  },

  async saveBot(botData: Partial<JSONBot>): Promise<JSONBot> {
    const bot = await this.getBot()
    const updated = {
      token: botData.token !== undefined ? botData.token : bot.token,
      username: botData.username !== undefined ? botData.username : bot.username,
      active: botData.active !== undefined ? botData.active : bot.active
    }
    await writeJsonFile(BOT_PATH, updated)
    return updated
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

  async createGroup(name: string, chatId: string, active = true): Promise<JSONGroup> {
    const groups = await this.getGroups()
    const nextId = groups.length > 0 ? Math.max(...groups.map(g => g.id)) + 1 : 1
    const newGroup: JSONGroup = {
      id: nextId,
      name,
      chatId,
      active
    }
    groups.push(newGroup)
    await this.saveGroups(groups)
    return newGroup
  },

  async updateGroup(id: number, updates: Partial<Omit<JSONGroup, 'id'>>): Promise<JSONGroup> {
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

  async createSchedule(title: string, message: string, time: string, active = true): Promise<JSONSchedule> {
    const schedules = await this.getSchedules()
    const nextId = schedules.length > 0 ? Math.max(...schedules.map(s => s.id)) + 1 : 1
    const newSchedule: JSONSchedule = {
      id: nextId,
      title,
      message,
      time,
      active
    }
    schedules.push(newSchedule)
    await this.saveSchedules(schedules)
    return newSchedule
  },

  async updateSchedule(id: number, updates: Partial<Omit<JSONSchedule, 'id'>>): Promise<JSONSchedule> {
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

    // Set scheduleId to null for logs associated with this schedule (SetNull)
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

  // Message Logs
  async getLogs(): Promise<JSONLog[]> {
    return readJsonFile<JSONLog[]>(LOGS_PATH, [])
  },

  async saveLogs(logs: JSONLog[]): Promise<void> {
    await writeJsonFile(LOGS_PATH, logs)
  },

  async createLog(groupId: number, scheduleId: number | null, message: string, status: 'SUCCESS' | 'FAILED', error: string | null = null): Promise<JSONLog> {
    const logs = await this.getLogs()
    const newLog: JSONLog = {
      id: crypto.randomUUID(),
      groupId,
      scheduleId,
      message,
      status,
      error,
      sentAt: new Date().toISOString()
    }
    logs.push(newLog)
    await this.saveLogs(logs)
    return newLog
  }
}
