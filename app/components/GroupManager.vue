<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGroupsStore } from '../stores/groups'
import { useToast } from '../composables/useToast'
import { Plus, Trash2, Edit2, ShieldAlert, RefreshCw } from 'lucide-vue-next'

const groupsStore = useGroupsStore()
const toast = useToast()

onMounted(() => {
  groupsStore.fetchGroups()
})

const showModal = ref(false)
const isEditing = ref(false)
const currentGroupId = ref('')
const formChatId = ref('')
const formName = ref('')

const openAddModal = () => {
  isEditing.value = false
  currentGroupId.value = ''
  formChatId.value = ''
  formName.value = ''
  showModal.value = true
}

const openEditModal = (group: any) => {
  isEditing.value = true
  currentGroupId.value = group.id
  formChatId.value = group.chatId
  formName.value = group.name
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSubmit = async () => {
  if (!formChatId.value.trim() || !formName.value.trim()) {
    toast.error('Both Chat ID and Group Name are required')
    return
  }

  try {
    if (isEditing.value) {
      const res = await groupsStore.updateGroup(currentGroupId.value, formChatId.value, formName.value)
      if (res.success) {
        toast.success('Group updated successfully!')
        closeModal()
      }
    } else {
      const res = await groupsStore.addGroup(formChatId.value, formName.value)
      if (res.success) {
        toast.success('Group added successfully!')
        closeModal()
      }
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Action failed')
  }
}

const handleToggleStatus = async (group: any) => {
  try {
    const targetStatus = !group.isActive
    await groupsStore.toggleGroupStatus(group.id, targetStatus)
    toast.success(`Group ${group.name} is now ${targetStatus ? 'enabled' : 'disabled'}`)
  } catch (error: any) {
    toast.error('Failed to update group status')
  }
}

const handleDeleteGroup = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete group "${name}"? This will delete all its execution logs.`)) {
    try {
      const res = await groupsStore.deleteGroup(id)
      if (res.success) {
        toast.success('Group deleted successfully!')
      }
    } catch (error: any) {
      toast.error('Failed to delete group')
    }
  }
}

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'Never'
  const date = new Date(timeStr)
  return date.toLocaleString()
}
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-bold text-white">Group Management</h3>
        <p class="text-xs text-slate-400">Configure target Telegram groups and supergroups</p>
      </div>
      <button
        @click="openAddModal"
        class="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex items-center gap-2 hover:-translate-y-0.5"
      >
        <Plus class="w-4 h-4" />
        Add Group
      </button>
    </div>

    <div v-if="groupsStore.isLoading && groupsStore.groups.length === 0" class="flex flex-col items-center justify-center py-12 gap-3">
      <RefreshCw class="w-8 h-8 text-purple-400 animate-spin" />
      <span class="text-sm text-slate-400">Loading groups...</span>
    </div>

    <div v-else-if="groupsStore.groups.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 bg-slate-950/60 rounded-full border border-slate-800 text-slate-500 mb-4">
        <ShieldAlert class="w-8 h-8" />
      </div>
      <h4 class="text-base font-bold text-slate-200">No Groups Found</h4>
      <p class="text-xs text-slate-400 mt-1 max-w-xs">
        Add Telegram groups with their unique negative Chat IDs to start broadcast scheduling.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-4 px-4">Group Name</th>
            <th class="py-4 px-4">Chat ID</th>
            <th class="py-4 px-4">Status</th>
            <th class="py-4 px-4">Last Message Time</th>
            <th class="py-4 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/40 text-slate-300 text-sm">
          <tr v-for="group in groupsStore.groups" :key="group.id" class="hover:bg-white/5 transition-colors">
            <td class="py-4 px-4 font-semibold text-white">{{ group.name }}</td>
            <td class="py-4 px-4 font-mono text-xs text-slate-400">{{ group.chatId }}</td>
            <td class="py-4 px-4">
              <button
                @click="handleToggleStatus(group)"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none animate-all"
                :class="group.isActive ? 'bg-purple-600' : 'bg-slate-700'"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="group.isActive ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </td>
            <td class="py-4 px-4 text-xs text-slate-400">
              {{ formatTime(group.lastMessageTime) }}
            </td>
            <td class="py-4 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="openEditModal(group)"
                  class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                  title="Edit Group"
                >
                  <Edit2 class="w-4 h-4" />
                </button>
                <button
                  @click="handleDeleteGroup(group.id, group.name)"
                  class="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                  title="Delete Group"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div @click="closeModal" class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10">
        <h3 class="text-lg font-bold text-white mb-2">
          {{ isEditing ? 'Edit Group Settings' : 'Add Target Group' }}
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          Enter the Telegram Group Name and Chat ID (must start with negative sign, e.g. -100xxxxxxxx).
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Group Name</label>
            <input
              type="text"
              v-model="formName"
              placeholder="E.g., Engineering Team"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Telegram Chat ID</label>
            <input
              type="text"
              v-model="formChatId"
              placeholder="E.g., -1002233445566"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-2.5 px-3.5 text-sm font-mono focus:outline-none"
            />
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
              {{ isEditing ? 'Save Changes' : 'Add Group' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
