<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLogsStore } from '../stores/logs'
import { useGroupsStore } from '../stores/groups'
import { useBotStore } from '../stores/bot'
import { Search, RotateCcw, CheckCircle, XCircle, ChevronLeft, ChevronRight, RefreshCw, Cpu } from 'lucide-vue-next'

const logsStore = useLogsStore()
const groupsStore = useGroupsStore()
const botStore = useBotStore()

const searchInput = ref('')

onMounted(async () => {
  await logsStore.fetchLogs()
  await groupsStore.fetchGroups()
  await botStore.fetchBots()
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
watch(() => logsStore.botId, () => logsStore.fetchLogs(1))

const getStatusClass = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    case 'FAILED':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    case 'RETRYING':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
    case 'PENDING':
      return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    default:
      return 'bg-slate-800 text-slate-400 border border-slate-700/50'
  }
}
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
    <div class="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
      <div>
        <h3 class="text-lg font-bold text-white">Execution Logs</h3>
        <p class="text-xs text-slate-400">Audit trail of scheduled and manual message delivery status</p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
        <!-- Search bar -->
        <div class="relative flex-1 md:flex-initial min-w-[160px]">
          <input
            type="text"
            v-model="searchInput"
            placeholder="Search logs..."
            class="w-full bg-slate-950/80 border border-slate-850 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl py-2 px-3 pl-8 text-xs focus:outline-none transition-all"
            @keyup.enter="handleSearch"
          />
          <Search class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
        </div>

        <!-- Status Filter -->
        <select
          v-model="logsStore.status"
          class="bg-slate-950/80 border border-slate-850 text-slate-350 rounded-xl py-2 px-2.5 text-xs focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RETRYING">Retrying</option>
          <option value="PENDING">Pending</option>
        </select>

        <!-- Bot Filter -->
        <select
          v-model="logsStore.botId"
          class="bg-slate-950/80 border border-slate-850 text-slate-350 rounded-xl py-2 px-2.5 text-xs focus:outline-none focus:border-purple-500 transition-all cursor-pointer max-w-[150px]"
        >
          <option value="">All Dispatch Bots</option>
          <option v-for="b in botStore.bots" :key="b.id" :value="String(b.id)">
            @{{ b.username }}
          </option>
        </select>

        <!-- Target Filter -->
        <select
          v-model="logsStore.groupId"
          class="bg-slate-950/80 border border-slate-850 text-slate-350 rounded-xl py-2 px-2.5 text-xs focus:outline-none focus:border-purple-500 transition-all cursor-pointer max-w-[150px]"
        >
          <option value="">All Targets</option>
          <option v-for="g in groupsStore.groups" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>

        <!-- Reset Button -->
        <button
          @click="handleClear"
          class="p-2 bg-slate-800 border border-slate-750 hover:bg-slate-755 text-slate-300 rounded-xl transition-all"
          title="Reset Filters"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-3 px-3">Bot</th>
            <th class="py-3 px-3">Destination Target</th>
            <th class="py-3 px-3">Message</th>
            <th class="py-3 px-3">Broadcast Time</th>
            <th class="py-3 px-3">Trigger Type</th>
            <th class="py-3 px-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-850 text-slate-300 text-xs">
          <!-- Pulse Loading -->
          <tr v-if="logsStore.isLoading" v-for="n in 5" :key="n" class="animate-pulse">
            <td class="py-3.5 px-3"><div class="h-3.5 bg-slate-850 rounded w-16"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-slate-850 rounded w-20"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-slate-850 rounded w-48"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-slate-850 rounded w-24"></div></td>
            <td class="py-3.5 px-3"><div class="h-3.5 bg-slate-850 rounded w-16"></div></td>
            <td class="py-3.5 px-3"><div class="h-5 bg-slate-850 rounded-full w-14"></div></td>
          </tr>

          <tr v-else-if="logsStore.logs.length === 0">
            <td colspan="6" class="py-16 text-center text-slate-500">
              No audit logs found matching filters.
            </td>
          </tr>

          <!-- Rows -->
          <tr v-else v-for="log in logsStore.logs" :key="log.id" class="hover:bg-slate-800/10 transition-colors">
            <td class="py-3.5 px-3">
              <div class="font-semibold text-white flex items-center gap-1">
                <Cpu class="w-3 h-3 text-purple-400" />
                {{ log.bot?.firstName }}
              </div>
              <div class="text-[9px] text-slate-500 font-mono mt-0.5">@{{ log.bot?.username }}</div>
            </td>

            <td class="py-3.5 px-3">
              <div class="font-semibold text-white">{{ log.group?.name || 'Manual/Deleted Target' }}</div>
              <div class="text-[9px] text-slate-500 font-mono mt-0.5">{{ log.group?.chatId }}</div>
            </td>

            <td class="py-3.5 px-3 max-w-xs md:max-w-sm truncate" :title="log.message">
              <span class="text-slate-200">{{ log.message }}</span>
            </td>

            <td class="py-3.5 px-3 text-slate-450">
              {{ new Date(log.sentAt).toLocaleString() }}
            </td>

            <td class="py-3.5 px-3">
              <span
                class="px-2 py-0.5 rounded text-[9px] font-semibold"
                :class="log.scheduleId ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
              >
                {{ log.schedule ? log.schedule.title : 'Manual Send' }}
              </span>
            </td>

            <td class="py-3.5 px-3">
              <div class="flex items-center gap-1.5">
                <span
                  class="px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 cursor-help w-max"
                  :class="getStatusClass(log.status)"
                  :title="log.error || undefined"
                >
                  {{ log.status }}
                </span>
                
                <span v-if="log.status === 'FAILED' && log.error" class="text-[10px] text-rose-450/80 max-w-[100px] truncate" :title="log.error">
                  {{ log.error }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="logsStore.pagination.totalPages > 1" class="flex items-center justify-between border-t border-slate-850 pt-4">
      <span class="text-xs text-slate-500">
        Showing Page {{ logsStore.pagination.page }} of {{ logsStore.pagination.totalPages }} (Total {{ logsStore.pagination.total }} logs)
      </span>
      <div class="flex gap-1.5">
        <button
          @click="handlePageChange(logsStore.pagination.page - 1)"
          :disabled="logsStore.pagination.page === 1"
          class="p-1.5 bg-slate-800 border border-slate-750 text-slate-350 rounded-xl hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          @click="handlePageChange(logsStore.pagination.page + 1)"
          :disabled="logsStore.pagination.page === logsStore.pagination.totalPages"
          class="p-1.5 bg-slate-800 border border-slate-750 text-slate-350 rounded-xl hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
