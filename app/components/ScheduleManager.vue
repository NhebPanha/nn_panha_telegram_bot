<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useSchedulesStore, type Schedule } from '../stores/schedules'
import { useBotStore } from '../stores/bot'
import { useGroupsStore } from '../stores/groups'
import { useToast } from '../composables/useToast'
import { CalendarRange, Plus, Trash2, Edit2, Clock, RefreshCw, FileText, Image, Video, File, Globe, AlertCircle, Users } from 'lucide-vue-next'

const schedulesStore = useSchedulesStore()
const botStore = useBotStore()
const groupsStore = useGroupsStore()
const toast = useToast()

onMounted(async () => {
  await schedulesStore.fetchSchedules()
  await botStore.fetchBot()
  await groupsStore.fetchGroups()
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
// Empty array = send to ALL active groups; otherwise only the selected group IDs
const formTargetGroupIds = ref<number[]>([])

const toggleTargetGroup = (groupId: number) => {
  const i = formTargetGroupIds.value.indexOf(groupId)
  if (i === -1) formTargetGroupIds.value.push(groupId)
  else formTargetGroupIds.value.splice(i, 1)
}

const selectAllGroups = () => {
  formTargetGroupIds.value = []
}

// Human-readable target label for a schedule card
const targetLabel = (s: Schedule) => {
  const ids = s.targetGroupIds || []
  if (ids.length === 0) return 'All groups'
  if (ids.length === 1) {
    const g = groupsStore.groups.find(gr => Number(gr.id) === ids[0])
    return g ? g.name : '1 group'
  }
  return `${ids.length} groups`
}

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
  formTargetGroupIds.value = []
  showModal.value = true
  groupsStore.fetchGroups()
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
  formTargetGroupIds.value = Array.isArray(schedule.targetGroupIds) ? [...schedule.targetGroupIds] : []
  showModal.value = true
  groupsStore.fetchGroups()
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
    parseMode: formParseMode.value,
    targetGroupIds: [...formTargetGroupIds.value]
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
  <div class="liquid-glass rounded-2xl p-6 relative overflow-hidden">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400 shadow-sm shadow-purple-500/20 backdrop-blur-md">
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
        class="liquid-glass-button disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        Create Schedule
      </button>
    </div>

    <!-- Alert if no bot -->
    <div v-if="!botStore.isConfigured" class="mb-6 p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-3 backdrop-blur-md shadow-sm">
      <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
      <div>
        <h5 class="text-sm font-bold text-amber-300">No Bot Configured</h5>
        <p class="text-xs text-slate-300 mt-1">
          You must configure and verify a Telegram Bot inside the <span class="font-bold text-white">Bot Settings</span> tab before creating schedules.
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
      <div class="p-4 bg-white/5 rounded-full border border-white/10 text-slate-400 mb-4 backdrop-blur-md">
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
        class="flex flex-col justify-between liquid-glass liquid-glass-interactive rounded-2xl p-5 group"
      >
        <div>
          <!-- Top details -->
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                {{ schedule.title }}
              </h4>
            </div>
            <button
              @click="handleToggleStatus(schedule)"
              class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="schedule.isActive ? 'bg-purple-600 shadow-sm shadow-purple-500/40' : 'bg-slate-850'"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="schedule.isActive ? 'translate-x-4' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Schedule Trigger Time & timezone -->
          <div class="flex flex-wrap gap-1.5 mb-3">
            <span class="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg font-mono">
              <Clock class="w-3 h-3" />
              {{ formatScheduleTime(schedule) }}
            </span>
            <span class="inline-flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-lg font-mono">
              <Globe class="w-3 h-3" />
              {{ schedule.timezone }}
            </span>
            <span class="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
              <Users class="w-3 h-3" />
              {{ targetLabel(schedule) }}
            </span>
          </div>

          <!-- Message Body Preview -->
          <div class="relative liquid-glass-subtle rounded-xl p-3 mb-4 text-xs leading-relaxed text-slate-300 italic min-h-[4.5rem] break-words">
            <!-- Format Icon -->
            <div class="absolute right-2 top-2 text-slate-400 flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider">
              <span class="px-1.5 py-0.5 liquid-glass-pill rounded text-slate-300">
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
        <div class="flex items-center justify-between border-t border-white/10 pt-3 text-[10px] text-slate-400">
          <span>Executed: {{ schedule.lastExecutedAt ? new Date(schedule.lastExecutedAt).toLocaleDateString() : 'Never' }}</span>
          <div class="flex items-center gap-1">
            <button
              @click="openEditModal(schedule)"
              class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              title="Edit Schedule"
            >
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button
              @click="handleDeleteSchedule(schedule.id, schedule.title)"
              class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/15 transition-all cursor-pointer"
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
      <div @click="closeModal" class="absolute inset-0 bg-slate-950/65 backdrop-blur-md" />

      <div class="relative w-full max-w-md liquid-glass-elevated rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto">
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
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm"
            />
          </div>

          <!-- Timezone -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Timezone</label>
            <select
              v-model="formTimezone"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-xs"
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
                class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
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
                class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm font-mono"
              />
              <input
                v-else
                type="time"
                v-model="formTime"
                class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm"
              />
            </div>
          </div>

          <!-- Weekly Day Picker -->
          <div v-if="formType === 'weekly'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Day of Week</label>
            <select
              v-model="formDayOfWeek"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
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
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <!-- Parsing mode -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Formatting Mode</label>
              <select
                v-model="formParseMode"
                class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
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
                class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
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
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm font-mono"
            />
          </div>

          <!-- Target Groups -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Send To</label>
            <div class="liquid-glass-subtle rounded-xl p-2.5 max-h-44 overflow-y-auto space-y-1">
              <!-- All groups option -->
              <button
                type="button"
                @click="selectAllGroups"
                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer"
                :class="formTargetGroupIds.length === 0 ? 'bg-purple-600/20 border border-purple-500/35' : 'hover:bg-white/5 border border-transparent'"
              >
                <span
                  class="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                  :class="formTargetGroupIds.length === 0 ? 'border-purple-500' : 'border-slate-500'"
                >
                  <span v-if="formTargetGroupIds.length === 0" class="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                </span>
                <Users class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-sm text-white font-medium">All active groups</span>
              </button>

              <div v-if="groupsStore.groups.length > 0" class="h-px bg-white/10 my-1"></div>

              <!-- Per-group checkboxes -->
              <button
                v-for="g in groupsStore.groups"
                :key="g.id"
                type="button"
                @click="toggleTargetGroup(Number(g.id))"
                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer"
                :class="formTargetGroupIds.includes(Number(g.id)) ? 'bg-white/10' : 'hover:bg-white/5'"
              >
                <span
                  class="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center"
                  :class="formTargetGroupIds.includes(Number(g.id)) ? 'border-purple-500 bg-purple-500' : 'border-slate-500'"
                >
                  <svg v-if="formTargetGroupIds.includes(Number(g.id))" class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd" />
                  </svg>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-white truncate">{{ g.name }}</p>
                  <p class="text-[10px] text-slate-400 font-mono truncate">{{ g.chatId }}</p>
                </div>
                <span v-if="!g.isActive" class="text-[9px] text-slate-400 uppercase font-bold">off</span>
              </button>

              <p v-if="groupsStore.groups.length === 0" class="text-xs text-slate-400 text-center py-3">
                No groups yet. Add targets in the Groups tab.
              </p>
            </div>
            <p class="text-[10px] text-slate-400 mt-1.5">
              {{ formTargetGroupIds.length === 0 ? 'This schedule will broadcast to every active group.' : `Sends only to ${formTargetGroupIds.length} selected group(s).` }}
            </p>
          </div>

          <!-- Text Message Box -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Message Body</label>
            <textarea
              v-model="formMessage"
              rows="4"
              placeholder="Enter message body here..."
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm resize-none"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 liquid-glass-pill hover:text-white text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 liquid-glass-button text-white text-sm font-medium py-2.5 rounded-xl transition-all cursor-pointer"
            >
              {{ isEditing ? 'Save Changes' : 'Create Schedule' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
