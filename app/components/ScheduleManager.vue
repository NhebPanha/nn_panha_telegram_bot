<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSchedulesStore, type Schedule } from '../stores/schedules'
import { useBotStore } from '../stores/bot'
import { useToast } from '../composables/useToast'
import { CalendarRange, Plus, Trash2, Edit2, Clock, RefreshCw, FileText, Image, Video, File, Globe, AlertCircle } from 'lucide-vue-next'

const schedulesStore = useSchedulesStore()
const botStore = useBotStore()
const toast = useToast()

onMounted(async () => {
  await schedulesStore.fetchSchedules()
  await botStore.fetchBot()
})

const showModal = ref(false)
const isEditing = ref(false)
const currentScheduleId = ref('')

// Form Fields
const formTitle = ref('')
const formType = ref<'one_time' | 'daily' | 'weekly' | 'monthly' | 'cron'>('daily')
const formTime = ref('')
const formDayOfWeek = ref<number>(1)
const formDayOfMonth = ref<number>(1)
const formTimezone = ref('Asia/Phnom_Penh')
const formMessage = ref('')
const formMessageType = ref<'text' | 'photo' | 'video' | 'document'>('text')
const formMediaUrl = ref('')
const formParseMode = ref<'HTML' | 'MarkdownV2'>('HTML')

// Key timezone list
const timezones = [
  { value: 'Asia/Phnom_Penh', label: 'Asia/Phnom Penh (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'America/New York (EST/EDT)' }
]

const weekdays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

const openAddModal = () => {
  isEditing.value = false
  currentScheduleId.value = ''
  formTitle.value = ''
  formType.value = 'daily'
  formTime.value = '08:00'
  formDayOfWeek.value = 1
  formDayOfMonth.value = 1
  formTimezone.value = 'Asia/Phnom_Penh'
  formMessage.value = ''
  formMessageType.value = 'text'
  formMediaUrl.value = ''
  formParseMode.value = 'HTML'
  showModal.value = true
}

const openEditModal = (schedule: any) => {
  isEditing.value = true
  currentScheduleId.value = schedule.id
  formTitle.value = schedule.title
  formType.value = schedule.type || 'daily'
  formTime.value = schedule.time
  formDayOfWeek.value = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : 1
  formDayOfMonth.value = schedule.dayOfMonth !== undefined ? schedule.dayOfMonth : 1
  formTimezone.value = schedule.timezone || 'Asia/Phnom_Penh'
  formMessage.value = schedule.message
  formMessageType.value = schedule.messageType || 'text'
  formMediaUrl.value = schedule.mediaUrl || ''
  formParseMode.value = schedule.parseMode || 'HTML'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  if (!formTitle.value.trim() || !formTime.value.trim() || !formMessage.value.trim()) {
    toast.error('Title, Schedule Type, Time/Cron, and Message are required')
    return
  }

  const payload: any = {
    title: formTitle.value.trim(),
    type: formType.value,
    time: formTime.value.trim(),
    timezone: formTimezone.value,
    message: formMessage.value.trim(),
    messageType: formMessageType.value,
    mediaUrl: formMessageType.value !== 'text' ? formMediaUrl.value.trim() : '',
    parseMode: formParseMode.value
  }

  if (formType.value === 'weekly') {
    payload.dayOfWeek = formDayOfWeek.value
  } else if (formType.value === 'monthly') {
    payload.dayOfMonth = formDayOfMonth.value
  }

  try {
    if (isEditing.value) {
      const res = await schedulesStore.updateSchedule(currentScheduleId.value, payload)
      if (res.success) {
        toast.success('Schedule updated successfully!')
        closeModal()
      }
    } else {
      const res = await schedulesStore.addSchedule(payload)
      if (res.success) {
        toast.success('Schedule created successfully!')
        closeModal()
      }
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Action failed')
  }
}

const handleToggleStatus = async (schedule: any) => {
  try {
    const targetStatus = !schedule.isActive
    await schedulesStore.toggleScheduleStatus(schedule.id, targetStatus)
    toast.success(`Schedule "${schedule.title}" is now ${targetStatus ? 'enabled' : 'disabled'}`)
  } catch (error: any) {
    toast.error('Failed to update status')
  }
}

const handleDeleteSchedule = async (id: string, title: string) => {
  if (confirm(`Are you sure you want to delete schedule "${title}"?`)) {
    try {
      const res = await schedulesStore.deleteSchedule(id)
      if (res.success) {
        toast.success('Schedule deleted successfully!')
      }
    } catch (error: any) {
      toast.error('Failed to delete schedule')
    }
  }
}

const formatScheduleTime = (s: Schedule) => {
  if (s.type === 'cron') return `Cron: ${s.time}`
  if (s.type === 'one_time') return `Once @ ${s.time}`
  if (s.type === 'daily') return `Daily @ ${s.time}`
  
  if (s.type === 'weekly') {
    const day = weekdays.find(w => w.value === s.dayOfWeek)?.label || 'Monday'
    return `Weekly on ${day} @ ${s.time}`
  }
  
  if (s.type === 'monthly') {
    return `Monthly on day ${s.dayOfMonth} @ ${s.time}`
  }
  
  return s.time
}

const getMsgTypeIcon = (type: string) => {
  switch (type) {
    case 'photo': return Image
    case 'video': return Video
    case 'document': return File
    default: return FileText
  }
}
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
          <CalendarRange class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-white">Broadcast Scheduler</h3>
          <p class="text-xs text-slate-400">Automate recurring and one-time messages to Telegram groups</p>
        </div>
      </div>
      <button
        @click="openAddModal"
        :disabled="!botStore.isConfigured"
        class="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex items-center gap-2 hover:-translate-y-0.5"
      >
        <Plus class="w-4 h-4" />
        Create Schedule
      </button>
    </div>

    <!-- Alert if no bot -->
    <div v-if="!botStore.isConfigured" class="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <h5 class="text-sm font-bold">No Bot Configured</h5>
        <p class="text-xs text-slate-400 mt-1">
          You must configure and verify a Telegram Bot inside the <span class="font-bold text-slate-350">Bot Settings</span> tab before creating schedules.
        </p>
      </div>
    </div>

    <!-- Loader -->
    <div v-if="schedulesStore.isLoading && schedulesStore.schedules.length === 0" class="flex flex-col items-center justify-center py-12 gap-3">
      <RefreshCw class="w-8 h-8 text-purple-400 animate-spin" />
      <span class="text-sm text-slate-400">Loading schedules...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="schedulesStore.schedules.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 bg-slate-950/60 rounded-full border border-slate-800 text-slate-500 mb-4">
        <Clock class="w-8 h-8" />
      </div>
      <h4 class="text-base font-bold text-slate-200">No Schedules Setup</h4>
      <p class="text-xs text-slate-400 mt-1 max-w-xs">
        Schedule broadcasts to automatically trigger messages on intervals.
      </p>
    </div>

    <!-- Schedules Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="schedule in schedulesStore.schedules"
        :key="schedule.id"
        class="flex flex-col justify-between bg-slate-950/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700/60 transition-all duration-300 group"
      >
        <div>
          <!-- Top details -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                {{ schedule.title }}
              </h4>
            </div>
            <button
              @click="handleToggleStatus(schedule)"
              class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="schedule.isActive ? 'bg-purple-600' : 'bg-slate-800'"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="schedule.isActive ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Schedule Trigger Time & timezone -->
          <div class="flex flex-wrap gap-1.5 mb-3">
            <span class="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
              <Clock class="w-3 h-3" />
              {{ formatScheduleTime(schedule) }}
            </span>
            <span class="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
              <Globe class="w-3 h-3" />
              {{ schedule.timezone }}
            </span>
          </div>

          <!-- Message Body Preview -->
          <div class="relative bg-slate-900/60 border border-slate-850/50 rounded-xl p-3 mb-4 text-xs leading-relaxed text-slate-350 italic min-h-[4.5rem] break-words">
            <!-- Format Icon -->
            <div class="absolute right-2 top-2 text-slate-600 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider">
              <span class="px-1 py-0.5 bg-slate-800 border border-slate-700/60 rounded">
                {{ schedule.parseMode }}
              </span>
              <component :is="getMsgTypeIcon(schedule.messageType)" class="w-3.5 h-3.5" />
            </div>
            
            <div v-if="schedule.messageType !== 'text'" class="text-[10px] text-purple-400 font-mono mb-1 truncate">
              Attachment: {{ schedule.mediaUrl }}
            </div>
            "{{ schedule.message }}"
          </div>
        </div>

        <!-- Footer actions & stats -->
        <div class="flex items-center justify-between border-t border-slate-900 pt-3 text-[10px] text-slate-500">
          <span>Executed: {{ schedule.lastExecutedAt ? new Date(schedule.lastExecutedAt).toLocaleDateString() : 'Never' }}</span>
          <div class="flex items-center gap-1">
            <button
              @click="openEditModal(schedule)"
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              title="Edit Schedule"
            >
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button
              @click="handleDeleteSchedule(schedule.id, schedule.title)"
              class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
              title="Delete Schedule"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Create / Edit Schedule -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div @click="closeModal" class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-white mb-2">
          {{ isEditing ? 'Edit Schedule' : 'Create Broadcast Schedule' }}
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          Set up scheduling routines and message payloads.
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Schedule Title</label>
            <input
              type="text"
              v-model="formTitle"
              placeholder="E.g., Engineering Weekly Report"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
            />
          </div>

          <!-- Timezone -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Timezone</label>
            <select
              v-model="formTimezone"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none"
            >
              <option v-for="tz in timezones" :key="tz.value" :value="tz.value">
                {{ tz.label }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Type Selector -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Schedule Type</label>
              <select
                v-model="formType"
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none"
              >
                <option value="one_time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="cron">Cron Expression</option>
              </select>
            </div>

            <!-- Time / Cron Input -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {{ formType === 'cron' ? 'Cron Expression' : 'Execution Time' }}
              </label>
              <input
                v-if="formType === 'cron'"
                type="text"
                v-model="formTime"
                placeholder="*/15 * * * *"
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm font-mono focus:outline-none"
              />
              <input
                v-else
                type="time"
                v-model="formTime"
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          <!-- Weekly Day Picker -->
          <div v-if="formType === 'weekly'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Day of Week</label>
            <select
              v-model="formDayOfWeek"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none"
            >
              <option v-for="wd in weekdays" :key="wd.value" :value="wd.value">
                {{ wd.label }}
              </option>
            </select>
          </div>

          <!-- Monthly Day Picker -->
          <div v-if="formType === 'monthly'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Day of Month</label>
            <input
              type="number"
              v-model="formDayOfMonth"
              min="1"
              max="31"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Parsing mode -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Formatting Mode</label>
              <select
                v-model="formParseMode"
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none"
              >
                <option value="HTML">HTML Mode</option>
                <option value="MarkdownV2">Markdown V2 Mode</option>
              </select>
            </div>

            <!-- Message Type -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Message Type</label>
              <select
                v-model="formMessageType"
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none"
              >
                <option value="text">Plain Text</option>
                <option value="photo">Photo Attachment</option>
                <option value="video">Video Attachment</option>
                <option value="document">Document/File</option>
              </select>
            </div>
          </div>

          <!-- Media Attachment URL -->
          <div v-if="formMessageType !== 'text'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Media Attachment URL</label>
            <input
              type="url"
              v-model="formMediaUrl"
              placeholder="https://example.com/image.png"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none font-mono"
            />
          </div>

          <!-- Text Message Box -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Message Body</label>
            <textarea
              v-model="formMessage"
              rows="4"
              placeholder="Enter message body here..."
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none resize-none"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-medium py-2.5 rounded-xl border border-slate-700/60 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2.5 rounded-xl shadow-lg shadow-purple-500/15 transition-all"
            >
              {{ isEditing ? 'Save Changes' : 'Create Schedule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
