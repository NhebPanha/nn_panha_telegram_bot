<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLogsStore } from '../stores/logs'
import { useGroupsStore } from '../stores/groups'
import { Search, RotateCcw, CheckCircle, XCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-vue-next'

const logsStore = useLogsStore()
const groupsStore = useGroupsStore()

const searchInput = ref('')

onMounted(async () => {
  await logsStore.fetchLogs()
  await groupsStore.fetchGroups()
})

const handleSearch = () => {
  logsStore.setSearch(searchInput.value)
}

const handleClear = () => {
  searchInput.value = ''
  logsStore.resetFilters()
}

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= logsStore.pagination.totalPages) {
    logsStore.fetchLogs(page)
  }
}

watch(() => logsStore.status, () => logsStore.fetchLogs(1))
watch(() => logsStore.groupId, () => logsStore.fetchLogs(1))

const getStatusClass = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
    case 'FAILED':
      return 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
    case 'RETRYING':
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse shadow-sm'
    case 'PENDING':
      return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
    default:
      return 'liquid-glass-pill text-slate-300'
  }
}
</script>

<template>
  <div class="liquid-glass rounded-2xl p-6 space-y-6 relative overflow-hidden">
    <div class="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
      <div>
        <h3 class="text-lg font-bold text-white tracking-tight">Execution Logs</h3>
        <p class="text-xs text-slate-400 mt-0.5">Audit trail of scheduled and manual message delivery status</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
        <!-- Search bar -->
        <div class="relative flex-1 md:flex-initial min-w-[170px]">
          <input
            type="text"
            v-model="searchInput"
            placeholder="Search logs..."
            class="w-full liquid-glass-input rounded-xl py-2 px-3 pl-8 text-xs placeholder-slate-400 focus:outline-none transition-all"
            @keyup.enter="handleSearch"
          />
          <Search class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
        </div>

        <!-- Status Filter -->
        <select
          v-model="logsStore.status"
          class="liquid-glass-input rounded-xl py-2 px-3 text-xs cursor-pointer transition-all"
        >
          <option value="" class="bg-slate-900 text-slate-200">All Statuses</option>
          <option value="SUCCESS" class="bg-slate-900 text-slate-200">Success</option>
          <option value="FAILED" class="bg-slate-900 text-slate-200">Failed</option>
        </select>

        <!-- Target Filter -->
        <select
          v-model="logsStore.groupId"
          class="liquid-glass-input rounded-xl py-2 px-3 text-xs cursor-pointer max-w-[150px] transition-all"
        >
          <option value="" class="bg-slate-900 text-slate-200">All Targets</option>
          <option v-for="g in groupsStore.groups" :key="g.id" :value="g.id" class="bg-slate-900 text-slate-200">
            {{ g.name }}
          </option>
        </select>

        <!-- Reset Button -->
        <button
          @click="handleClear"
          class="p-2 liquid-glass-pill hover:border-white/30 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
          title="Reset Filters"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto min-h-[300px] rounded-xl border border-white/5 bg-slate-950/20">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-white/10 text-slate-400 text-xs font-semibold tracking-wider">
            <th class="py-3 px-3">Destination Target</th>
            <th class="py-3 px-3">Message</th>
            <th class="py-3 px-3">Broadcast Time</th>
            <th class="py-3 px-3">Trigger Type</th>
            <th class="py-3 px-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 text-slate-300 text-xs">
          <!-- Pulse Loading -->
          <tr v-if="logsStore.isLoading" v-for="n in 5" :key="n" class="animate-pulse">
            <td class="py-3.5 px-3"><div class="h-3.5 bg-white/10 rounded w-20"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-white/10 rounded w-48"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-white/10 rounded w-24"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-white/10 rounded w-16"></div></td>
            <td class="py-3.5 px-3"><div class="h-5 bg-white/10 rounded-full w-14"></div></td>
          </tr>

          <tr v-else-if="logsStore.logs.length === 0">
            <td colspan="5" class="py-16 text-center text-slate-400">
              No audit logs found matching filters.
            </td>
          </tr>

          <!-- Rows -->
          <tr v-else v-for="log in logsStore.logs" :key="log.id" class="hover:bg-white/[0.04] transition-colors">
            <td class="py-3.5 px-3">
              <div class="font-semibold text-white">{{ log.group?.name || 'Manual/Deleted Target' }}</div>
              <div class="text-[9px] text-slate-400 font-mono mt-0.5">{{ log.group?.chatId }}</div>
            </td>

            <td class="py-3.5 px-3 max-w-xs md:max-w-sm truncate" :title="log.message">
              <span class="text-slate-200">{{ log.message }}</span>
            </td>

            <td class="py-3.5 px-3 text-slate-400">
              {{ new Date(log.sentAt).toLocaleString() }}
            </td>

            <td class="py-3.5 px-3">
              <span
                class="px-2.5 py-0.5 rounded-lg text-[9px] font-semibold backdrop-blur-sm shadow-sm"
                :class="log.scheduleId ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'"
              >
                {{ log.schedule ? log.schedule.title : 'Manual Send' }}
              </span>
            </td>

            <td class="py-3.5 px-3">
              <div class="flex items-center gap-1.5">
                <span
                  class="px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 cursor-help w-max shadow-sm"
                  :class="getStatusClass(log.status)"
                  :title="log.error || undefined"
                >
                  {{ log.status }}
                </span>
                
                <span v-if="log.status === 'FAILED' && log.error" class="text-[10px] text-rose-400/90 max-w-[100px] truncate" :title="log.error">
                  {{ log.error }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="logsStore.pagination.totalPages > 1" class="flex items-center justify-between border-t border-white/10 pt-4">
      <span class="text-xs text-slate-400">
        Showing Page {{ logsStore.pagination.page }} of {{ logsStore.pagination.totalPages }} (Total {{ logsStore.pagination.total }} logs)
      </span>
      <div class="flex gap-1.5">
        <button
          @click="handlePageChange(logsStore.pagination.page - 1)"
          :disabled="logsStore.pagination.page === 1"
          class="p-1.5 liquid-glass-pill text-slate-300 hover:text-white rounded-xl hover:border-white/30 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          @click="handlePageChange(logsStore.pagination.page + 1)"
          :disabled="logsStore.pagination.page === logsStore.pagination.totalPages"
          class="p-1.5 liquid-glass-pill text-slate-300 hover:text-white rounded-xl hover:border-white/30 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
