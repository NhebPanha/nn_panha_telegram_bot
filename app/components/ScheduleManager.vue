<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSchedulesStore } from '../stores/schedules'
import { useToast } from '../composables/useToast'
import { CalendarRange, Plus, Trash2, Edit2, Clock, RefreshCw } from 'lucide-vue-next'

const schedulesStore = useSchedulesStore()
const toast = useToast()

onMounted(() => {
  schedulesStore.fetchSchedules()
})

const showModal = ref(false)
const isEditing = ref(false)
const currentScheduleId = ref('')
const formTitle = ref('')
const formTime = ref('')
const formMessage = ref('')

const openAddModal = () => {
  isEditing.value = false
  currentScheduleId.value = ''
  formTitle.value = ''
  formTime.value = ''
  formMessage.value = ''
  showModal.value = true
}

const openEditModal = (schedule: any) => {
  isEditing.value = true
  currentScheduleId.value = schedule.id
  formTitle.value = schedule.title
  formTime.value = schedule.time
  formMessage.value = schedule.message
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  if (!formTitle.value.trim() || !formTime.value.trim() || !formMessage.value.trim()) {
    toast.error('All fields are required')
    return
  }

  try {
    if (isEditing.value) {
      const res = await schedulesStore.updateSchedule(currentScheduleId.value, formTitle.value, formMessage.value, formTime.value)
      if (res.success) {
        toast.success('Schedule updated successfully!')
        closeModal()
      }
    } else {
      const res = await schedulesStore.addSchedule(formTitle.value, formMessage.value, formTime.value)
      if (res.success) {
        toast.success('Schedule added successfully!')
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
    toast.error('Failed to update schedule status')
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

const format12Hour = (time24: string) => {
  if (!time24) return ''
  const [hoursStr, minutesStr] = time24.split(':')
  const hours = parseInt(hoursStr)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${String(displayHours).padStart(2, '0')}:${minutesStr} ${ampm}`
}
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
          <CalendarRange class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-lg font-bold text-white">Schedule Management</h3>
          <p class="text-xs text-slate-400">Create and toggle daily message dispatch triggers</p>
        </div>
      </div>
      <button
        @click="openAddModal"
        class="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex items-center gap-2 hover:-translate-y-0.5"
      >
        <Plus class="w-4 h-4" />
        Create Schedule
      </button>
    </div>

    <div v-if="schedulesStore.isLoading && schedulesStore.schedules.length === 0" class="flex flex-col items-center justify-center py-12 gap-3">
      <RefreshCw class="w-8 h-8 text-purple-400 animate-spin" />
      <span class="text-sm text-slate-400">Loading schedules...</span>
    </div>

    <div v-else-if="schedulesStore.schedules.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 bg-slate-950/60 rounded-full border border-slate-800 text-slate-500 mb-4">
        <Clock class="w-8 h-8" />
      </div>
      <h4 class="text-base font-bold text-slate-200">No Schedules Setup</h4>
      <p class="text-xs text-slate-400 mt-1 max-w-xs">
        Configure broadcast intervals. Default schedules will boot automatically on server load.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="schedule in schedulesStore.schedules"
        :key="schedule.id"
        class="flex flex-col justify-between bg-slate-950/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700/60 transition-all duration-300 group"
      >
        <div>
          <div class="flex items-start justify-between gap-4 mb-3">
            <div>
              <h4 class="text-base font-bold text-white group-hover:text-purple-400 transition-colors">
                {{ schedule.title }}
              </h4>
              <span class="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-mono mt-1.5">
                <Clock class="w-3.5 h-3.5" />
                {{ format12Hour(schedule.time) }}
              </span>
            </div>
            <button
              @click="handleToggleStatus(schedule)"
              class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="schedule.isActive ? 'bg-purple-600' : 'bg-slate-700'"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="schedule.isActive ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="bg-slate-900/60 border border-slate-850/50 rounded-xl p-3.5 mb-4 text-xs leading-relaxed text-slate-350 italic min-h-[4.5rem] break-words">
            "{{ schedule.message }}"
          </div>
        </div>

        <div class="flex items-center justify-end border-t border-slate-900 pt-3 gap-2">
          <button
            @click="openEditModal(schedule)"
            class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            title="Edit Schedule"
          >
            <Edit2 class="w-4 h-4" />
          </button>
          <button
            @click="handleDeleteSchedule(schedule.id, schedule.title)"
            class="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
            title="Delete Schedule"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div @click="closeModal" class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">
          {{ isEditing ? 'Edit Schedule Settings' : 'Create Schedule' }}
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          Define the message text and dispatch execution time.
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Schedule Title</label>
            <input
              type="text"
              v-model="formTitle"
              placeholder="E.g., Morning Greeting"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Execution Time (24h format)</label>
            <input
              type="time"
              v-model="formTime"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Message Content</label>
            <textarea
              v-model="formMessage"
              rows="4"
              placeholder="Good morning everyone! 🌞..."
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex items-center gap-3 pt-4">
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
