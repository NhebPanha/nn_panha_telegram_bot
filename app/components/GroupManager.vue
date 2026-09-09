<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGroupsStore } from '../stores/groups'
import { useToast } from '../composables/useToast'
import { Plus, Trash2, Edit2, ShieldAlert, RefreshCw, Search, ShieldCheck, CheckSquare, Square, Download, Upload } from 'lucide-vue-next'

const groupsStore = useGroupsStore()
const toast = useToast()

onMounted(async () => {
  await groupsStore.fetchGroups()
})

const showModal = ref(false)
const showBulkModal = ref(false)
const isEditing = ref(false)
const currentGroupId = ref('')
const formChatId = ref('')
const formName = ref('')
const formType = ref<'group' | 'channel' | 'supergroup' | 'private'>('group')

// Search and Filter State
const searchQuery = ref('')
const typeFilter = ref('')

// Bulk Selection
const selectedGroupIds = ref<string[]>([])

// Bulk Import Input
const bulkImportText = ref('')
const bulkImportType = ref<'group' | 'channel' | 'supergroup' | 'private'>('group')

// Computed filter list
const filteredGroups = computed(() => {
  return groupsStore.groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          g.chatId.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesType = typeFilter.value ? g.type === typeFilter.value : true
    return matchesSearch && matchesType
  })
})

const isAllSelected = computed(() => {
  return filteredGroups.value.length > 0 && selectedGroupIds.value.length === filteredGroups.value.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedGroupIds.value = []
  } else {
    selectedGroupIds.value = filteredGroups.value.map(g => g.id)
  }
}

const toggleSelectGroup = (id: string) => {
  const index = selectedGroupIds.value.indexOf(id)
  if (index === -1) {
    selectedGroupIds.value.push(id)
  } else {
    selectedGroupIds.value.splice(index, 1)
  }
}

const openAddModal = () => {
  isEditing.value = false
  currentGroupId.value = ''
  formChatId.value = ''
  formName.value = ''
  formType.value = 'group'
  showModal.value = true
}

const openEditModal = (group: any) => {
  isEditing.value = true
  currentGroupId.value = group.id
  formChatId.value = group.chatId
  formName.value = group.name
  formType.value = group.type || 'group'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const openBulkModal = () => {
  bulkImportText.value = ''
  bulkImportType.value = 'group'
  showBulkModal.value = true
}

const closeBulkModal = () => {
  showBulkModal.value = false
}

const handleSubmit = async () => {
  if (!formChatId.value.trim()) {
    toast.error('Telegram Chat ID is required')
    return
  }

  try {
    if (isEditing.value) {
      const res = await groupsStore.updateGroup(
        currentGroupId.value,
        formChatId.value.trim(),
        formName.value.trim(),
        formType.value
      )
      if (res.success) {
        toast.success('Broadcast target updated successfully!')
        closeModal()
      }
    } else {
      const res = await groupsStore.addGroup(
        formChatId.value.trim(),
        formName.value.trim(),
        formType.value
      )
      if (res.success) {
        toast.success(`Target added successfully! Auto-detected: ${res.group.name}`)
        closeModal()
      }
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Action failed')
  }
}

const handleBulkImport = async () => {
  const chatIds = bulkImportText.value
    .split(/[\n,]+/)
    .map(id => id.trim())
    .filter(id => id.length > 0)

  if (chatIds.length === 0) {
    toast.error('Please input at least one Chat ID')
    return
  }

  let successCount = 0
  let errorCount = 0

  for (const chatId of chatIds) {
    try {
      const res = await groupsStore.addGroup(chatId, '', bulkImportType.value)
      if (res.success) successCount++
    } catch {
      errorCount++
    }
  }

  toast.success(`Bulk import completed: ${successCount} added, ${errorCount} skipped/failed.`)
  closeBulkModal()
}

const handleToggleStatus = async (group: any) => {
  try {
    const targetStatus = !group.isActive
    await groupsStore.toggleGroupStatus(group.id, targetStatus)
    toast.success(`Target ${group.name} is now ${targetStatus ? 'enabled' : 'disabled'}`)
  } catch (error: any) {
    toast.error('Failed to update status')
  }
}

const handleDeleteGroup = async (id: string, name: string) => {
  if (confirm(`Are you sure you want to delete "${name}"? This deletes all associated message logs.`)) {
    try {
      const res = await groupsStore.deleteGroup(id)
      if (res.success) {
        toast.success('Target deleted successfully!')
      }
    } catch (error: any) {
      toast.error('Failed to delete target')
    }
  }
}

const handleDeleteSelected = async () => {
  if (selectedGroupIds.value.length === 0) return
  if (!confirm(`Are you sure you want to delete all ${selectedGroupIds.value.length} selected targets?`)) return

  let deletedCount = 0
  for (const id of selectedGroupIds.value) {
    try {
      await groupsStore.deleteGroup(id)
      deletedCount++
    } catch {}
  }
  selectedGroupIds.value = []
  toast.success(`Deleted ${deletedCount} targets successfully.`)
}

const getTargetTypeColor = (type: string) => {
  switch (type) {
    case 'channel': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'supergroup': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'private': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }
}

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return 'Never'
  const date = new Date(timeStr)
  return date.toLocaleString()
}
</script>

<template>
  <div class="liquid-glass rounded-2xl p-6 space-y-6 relative overflow-hidden">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 class="text-lg font-bold text-white">Groups & Channels Manager</h3>
        <p class="text-xs text-slate-400">Configure target Telegram groups, channels, and direct chats</p>
      </div>
      <div class="flex gap-2 w-full sm:w-auto">
        <button
          @click="openBulkModal"
          class="flex-1 sm:flex-initial liquid-glass-pill hover:text-white text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Upload class="w-4 h-4" />
          Bulk Import
        </button>
        <button
          @click="openAddModal"
          class="flex-1 sm:flex-initial liquid-glass-button text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          Add Target
        </button>
      </div>
    </div>

    <!-- Search & Filters -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 liquid-glass-subtle p-3 rounded-xl">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by name or Chat ID..."
          class="w-full liquid-glass-input rounded-xl py-2 px-9 text-xs"
        />
      </div>

      <div>
        <select
          v-model="typeFilter"
          class="w-full liquid-glass-input rounded-xl py-2 px-3 text-xs"
        >
          <option value="">All Chat Types</option>
          <option value="group">Group</option>
          <option value="channel">Channel</option>
          <option value="supergroup">Supergroup</option>
          <option value="private">Private Chat</option>
        </select>
      </div>
    </div>

    <!-- Bulk Actions Panel -->
    <div v-if="selectedGroupIds.length > 0" class="flex items-center justify-between liquid-glass-pill px-4 py-3 rounded-xl border-purple-500/30">
      <span class="text-xs font-semibold text-purple-300">
        {{ selectedGroupIds.length }} item(s) selected
      </span>
      <button
        @click="handleDeleteSelected"
        class="bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <Trash2 class="w-3.5 h-3.5" />
        Delete Selected
      </button>
    </div>

    <!-- Main List Loader -->
    <div v-if="groupsStore.isLoading && groupsStore.groups.length === 0" class="flex flex-col items-center justify-center py-12 gap-3">
      <RefreshCw class="w-8 h-8 text-purple-400 animate-spin" />
      <span class="text-sm text-slate-400">Loading targets...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredGroups.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="p-4 bg-white/5 rounded-full border border-white/10 text-slate-400 mb-4 backdrop-blur-md">
        <ShieldAlert class="w-8 h-8" />
      </div>
      <h4 class="text-base font-bold text-slate-200">No Target Chats Found</h4>
      <p class="text-xs text-slate-400 mt-1 max-w-xs">
        No records match your search parameters or registry. Create targets above.
      </p>
    </div>

    <!-- Targets Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-3 px-3 w-8">
              <button @click="toggleSelectAll" class="text-slate-400 hover:text-white cursor-pointer">
                <CheckSquare v-if="isAllSelected" class="w-4 h-4 text-purple-400" />
                <Square v-else class="w-4 h-4" />
              </button>
            </th>
            <th class="py-3 px-3">Type</th>
            <th class="py-3 px-3">Target Name</th>
            <th class="py-3 px-3">Telegram Chat ID</th>
            <th class="py-3 px-3">Verified Status</th>
            <th class="py-3 px-3">Active</th>
            <th class="py-3 px-3">Last Message</th>
            <th class="py-3 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 text-slate-200 text-xs">
          <tr v-for="group in filteredGroups" :key="group.id" class="hover:bg-white/[0.04] transition-colors">
            <td class="py-3.5 px-3">
              <button @click="toggleSelectGroup(group.id)" class="text-slate-400 hover:text-white cursor-pointer">
                <CheckSquare v-if="selectedGroupIds.includes(group.id)" class="w-4 h-4 text-purple-400" />
                <Square v-else class="w-4 h-4" />
              </button>
            </td>
            <td class="py-3.5 px-3">
              <span
                class="px-2 py-0.5 rounded border text-[9px] font-bold uppercase"
                :class="getTargetTypeColor(group.type)"
              >
                {{ group.type }}
              </span>
            </td>
            <td class="py-3.5 px-3 font-semibold text-white">{{ group.name }}</td>
            <td class="py-3.5 px-3 font-mono text-[10px] text-slate-400">{{ group.chatId }}</td>
            <td class="py-3.5 px-3">
              <span
                v-if="group.permissionsVerified"
                class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"
              >
                <ShieldCheck class="w-3.5 h-3.5" />
                Verified
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-full text-[9px] font-bold liquid-glass-pill text-slate-400 flex items-center gap-1 w-max"
              >
                Unchecked
              </span>
            </td>
            <td class="py-3.5 px-3">
              <button
                @click="handleToggleStatus(group)"
                class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="group.isActive ? 'bg-purple-600 shadow-sm shadow-purple-500/40' : 'bg-slate-850'"
              >
                <span
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="group.isActive ? 'translate-x-4' : 'translate-x-0'"
                />
              </button>
            </td>
            <td class="py-3.5 px-3 text-slate-400">
              {{ formatTime(group.lastMessageTime) }}
            </td>
            <td class="py-3.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button
                  @click="openEditModal(group)"
                  class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                  title="Edit Settings"
                >
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="handleDeleteGroup(group.id, group.name)"
                  class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/15 transition-all cursor-pointer"
                  title="Delete Target"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal: Add/Edit Target -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div @click="closeModal" class="absolute inset-0 bg-slate-950/65 backdrop-blur-md" />

      <div class="relative w-full max-w-md liquid-glass-elevated rounded-2xl p-6 z-10">
        <h3 class="text-lg font-bold text-white mb-2">
          {{ isEditing ? 'Edit Broadcast Target' : 'Add Broadcast Target' }}
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          Specify destination Chat IDs. Telegram groups/supergroups IDs start with negative sign, public channel/group names start with @.
        </p>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Chat ID Input -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Telegram Chat ID</label>
            <input
              type="text"
              v-model="formChatId"
              placeholder="E.g., -1002233445566 or @my_channel"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm font-mono"
            />
          </div>

          <!-- Type Selector -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Chat Type</label>
            <select
              v-model="formType"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
            >
              <option value="group">Group</option>
              <option value="channel">Channel</option>
              <option value="supergroup">Supergroup</option>
              <option value="private">Private User Chat</option>
            </select>
          </div>

          <!-- Optional Name -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Manual Display Name (Optional)</label>
            <input
              type="text"
              v-model="formName"
              placeholder="E.g., Production Alerts Channel"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm"
            />
          </div>

          <!-- Form Buttons -->
          <div class="flex items-center gap-3 pt-4">
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
              {{ isEditing ? 'Save Changes' : 'Save Target' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Bulk Import -->
    <div v-if="showBulkModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div @click="closeBulkModal" class="absolute inset-0 bg-slate-950/65 backdrop-blur-md" />

      <div class="relative w-full max-w-md liquid-glass-elevated rounded-2xl p-6 z-10">
        <h3 class="text-lg font-bold text-white mb-2">
          Bulk Import Targets
        </h3>
        <p class="text-xs text-slate-400 mb-6">
          Paste multiple Telegram Chat IDs separated by commas or new lines.
        </p>

        <form @submit.prevent="handleBulkImport" class="space-y-4">
          <!-- Text Area -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Chat IDs List</label>
            <textarea
              v-model="bulkImportText"
              placeholder="-10011223344&#10;-10055667788&#10;@my_custom_channel"
              rows="6"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm font-mono resize-none"
            ></textarea>
          </div>

          <!-- Type Selection -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Target Type (Bulk)</label>
            <select
              v-model="bulkImportType"
              class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
            >
              <option value="group">Group</option>
              <option value="channel">Channel</option>
              <option value="supergroup">Supergroup</option>
              <option value="private">Private User Chat</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-4">
            <button
              type="button"
              @click="closeBulkModal"
              class="flex-1 liquid-glass-pill hover:text-white text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 liquid-glass-button text-white text-sm font-medium py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Import Targets
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
