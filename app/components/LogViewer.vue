<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useLogsStore } from '../stores/logs'
import { useGroupsStore } from '../stores/groups'
import { Search, RotateCcw, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next'

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
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
    <div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
      <div>
        <h3 class="text-lg font-bold text-white">Execution Logs</h3>
        <p class="text-xs text-slate-400">Audit trail of scheduled and manual message delivery status</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:flex-initial min-w-[200px]">
          <input
            type="text"
            v-model="searchInput"
            placeholder="Search logs..."
            class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-650 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none transition-all"
            @keyup.enter="handleSearch"
          />
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
        </div>

        <select
          v-model="logsStore.status"
          class="bg-slate-950/80 border border-slate-800 text-slate-300 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>

        <select
          v-model="logsStore.groupId"
          class="bg-slate-950/80 border border-slate-800 text-slate-300 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-purple-500 transition-all cursor-pointer max-w-[150px]"
        >
          <option value="">All Groups</option>
          <option v-for="g in groupsStore.groups" :key="g.id" :value="g.id">
            {{ g.name }}
          </option>
        </select>

        <button
          @click="handleClear"
          class="p-2.5 bg-slate-800 border border-slate-700/60 hover:bg-slate-750 text-slate-300 rounded-xl transition-all"
          title="Reset Filters"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <div class="overflow-x-auto min-h-[300px]">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th class="py-4 px-4">Group</th>
            <th class="py-4 px-4">Message</th>
            <th class="py-4 px-4">Sent Time</th>
            <th class="py-4 px-4">Trigger</th>
            <th class="py-4 px-4">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/40 text-slate-300 text-sm">
          <tr v-if="logsStore.isLoading" v-for="n in 5" :key="n" class="animate-pulse">
            <td class="py-4 px-4"><div class="h-4 bg-slate-850 rounded w-24"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-850 rounded w-64"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-850 rounded w-32"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-850 rounded w-16"></div></td>
            <td class="py-4 px-4"><div class="h-6 bg-slate-850 rounded-full w-16"></div></td>
          </tr>

          <tr v-else-if="logsStore.logs.length === 0">
            <td colspan="5" class="py-16 text-center text-slate-500 text-xs">
              No message logs found matching filters.
            </td>
          </tr>

          <tr v-else v-for="log in logsStore.logs" :key="log.id" class="hover:bg-white/5 transition-colors">
            <td class="py-4 px-4">
              <div class="font-semibold text-white">{{ log.group?.name || 'Deleted Group' }}</div>
              <div class="text-[10px] text-slate-500 font-mono mt-0.5">{{ log.group?.chatId }}</div>
            </td>

            <td class="py-4 px-4 max-w-xs md:max-w-sm truncate" :title="log.message">
              <span class="text-slate-200">{{ log.message }}</span>
            </td>

            <td class="py-4 px-4 text-xs text-slate-400">
              {{ new Date(log.sentAt).toLocaleString() }}
            </td>

            <td class="py-4 px-4">
              <span
                class="px-2 py-0.5 rounded text-[10px] font-semibold"
                :class="log.scheduleId ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'"
              >
                {{ log.schedule ? log.schedule.title : 'Manual Test' }}
              </span>
            </td>

            <td class="py-4 px-4">
              <div class="flex items-center gap-1.5">
                <span
                  class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 cursor-help"
                  :class="log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
                  :title="log.error || undefined"
                >
                  <CheckCircle v-if="log.status === 'SUCCESS'" class="w-3.5 h-3.5" />
                  <XCircle v-else class="w-3.5 h-3.5" />
                  {{ log.status }}
                </span>
                
                <span v-if="log.status === 'FAILED' && log.error" class="text-[11px] text-rose-450/80 max-w-[125px] truncate" :title="log.error">
                  {{ log.error }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="logsStore.pagination.totalPages > 1" class="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-4">
      <span class="text-xs text-slate-500">
        Showing Page {{ logsStore.pagination.page }} of {{ logsStore.pagination.totalPages }} (Total {{ logsStore.pagination.total }} logs)
      </span>
      <div class="flex gap-2">
        <button
          @click="handlePageChange(logsStore.pagination.page - 1)"
          :disabled="logsStore.pagination.page === 1"
          class="p-2 bg-slate-800 border border-slate-700/60 text-slate-300 rounded-xl hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          @click="handlePageChange(logsStore.pagination.page + 1)"
          :disabled="logsStore.pagination.page === logsStore.pagination.totalPages"
          class="p-2 bg-slate-800 border border-slate-700/60 text-slate-300 rounded-xl hover:bg-slate-750 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
