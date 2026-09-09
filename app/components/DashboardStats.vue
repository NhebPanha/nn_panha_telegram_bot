<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDashboardStore } from '../stores/dashboard'
import { Users, CalendarRange, CheckCircle2, Clock, ShieldAlert, Cpu } from 'lucide-vue-next'

const dashboardStore = useDashboardStore()

const timeRemaining = ref('')
let timer: any = null

const calculateCountdown = () => {
  const next = dashboardStore.stats.nextSchedule
  if (!next) {
    timeRemaining.value = 'No active schedules'
    return
  }

  const execTime = new Date(next.execTime).getTime()
  const now = new Date().getTime()
  const diff = execTime - now

  if (diff <= 0) {
    timeRemaining.value = 'Processing...'
    setTimeout(() => {
      dashboardStore.fetchStats()
    }, 3000)
    return
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)

  timeRemaining.value = parts.join(' ')
}

onMounted(() => {
  dashboardStore.fetchStats()
  timer = setInterval(calculateCountdown, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(() => dashboardStore.stats.nextSchedule, calculateCountdown)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
    <!-- Stat Card: Bots Status -->
    <div class="relative overflow-hidden liquid-glass liquid-glass-interactive rounded-2xl p-6 group">
      <div class="absolute -right-3 -bottom-3 text-white/[0.03] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
        <Cpu class="w-24 h-24" />
      </div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400 backdrop-blur-md shadow-sm shadow-indigo-500/20">
          <Cpu class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Bot Status</p>
          <h3 class="text-2xl font-bold text-white mt-1">
            {{ dashboardStore.stats.botOnline ? 'Online' : (dashboardStore.stats.botConfigured ? 'Offline' : 'None') }}
          </h3>
          <p class="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
            {{ dashboardStore.stats.botUsername ? '@' + dashboardStore.stats.botUsername : 'No bot configured' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Stat Card: Targets Coverage -->
    <div class="relative overflow-hidden liquid-glass liquid-glass-interactive rounded-2xl p-6 group">
      <div class="absolute -right-3 -bottom-3 text-white/[0.03] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
        <Users class="w-24 h-24" />
      </div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="p-3 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400 backdrop-blur-md shadow-sm shadow-blue-500/20">
          <Users class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Targets Coverage</p>
          <h3 class="text-2xl font-bold text-white mt-1">
            {{ dashboardStore.stats.totalGroups }} <span class="text-xs font-normal text-slate-400">Groups</span>
            <span class="text-xs text-slate-500 mx-1">|</span>
            <span class="text-2xl font-bold text-white">{{ dashboardStore.stats.totalChannels }}</span> <span class="text-xs font-normal text-slate-400">Chs</span>
          </h3>
        </div>
      </div>
    </div>

    <!-- Stat Card: Delivery Queue -->
    <div class="relative overflow-hidden liquid-glass liquid-glass-interactive rounded-2xl p-6 group">
      <div class="absolute -right-3 -bottom-3 text-white/[0.03] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
        <CalendarRange class="w-24 h-24" />
      </div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="p-3 bg-violet-500/15 border border-violet-500/30 rounded-xl text-violet-400 backdrop-blur-md shadow-sm shadow-violet-500/20">
          <CalendarRange class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Active Schedules</p>
          <h3 class="text-2xl font-bold text-white mt-1">
            {{ dashboardStore.stats.activeSchedules }} <span class="text-xs font-normal text-slate-400">/ {{ dashboardStore.stats.totalSchedules }} total</span>
          </h3>
        </div>
      </div>
    </div>

    <!-- Stat Card: Broadcast Success -->
    <div class="relative overflow-hidden liquid-glass liquid-glass-interactive rounded-2xl p-6 group">
      <div class="absolute -right-3 -bottom-3 text-white/[0.03] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
        <CheckCircle2 class="w-24 h-24" />
      </div>
      <div class="flex items-center gap-4 relative z-10">
        <div class="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 backdrop-blur-md shadow-sm shadow-emerald-500/20">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Broadcast Success</p>
          <h3 class="text-2xl font-bold text-white mt-1">
            {{ dashboardStore.stats.successRate }}% <span class="text-xs font-normal text-slate-400">({{ dashboardStore.stats.messagesSent }} sent)</span>
          </h3>
        </div>
      </div>
    </div>

    <!-- Stat Card: Next Scheduled Message -->
    <div class="relative overflow-hidden liquid-glass liquid-glass-interactive rounded-2xl p-6 xl:col-span-1 lg:col-span-1 sm:col-span-2 group">
      <div class="absolute -right-3 -bottom-3 text-white/[0.03] group-hover:scale-110 transition-transform duration-300 pointer-events-none">
        <Clock class="w-24 h-24" />
      </div>
      <div class="flex items-start gap-4 relative z-10">
        <div class="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 backdrop-blur-md shadow-sm shadow-amber-500/20">
          <Clock class="w-6 h-6" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold tracking-wider text-slate-400 uppercase">Next Broadcast</p>
          <h3 class="text-sm font-bold text-amber-400 mt-1 truncate" :title="dashboardStore.stats.nextSchedule?.title">
            {{ dashboardStore.stats.nextSchedule ? dashboardStore.stats.nextSchedule.title : 'None' }}
          </h3>
          <p class="text-[10px] text-slate-400 font-mono mt-0.5">
            {{ dashboardStore.stats.nextSchedule ? `@ ${dashboardStore.stats.nextSchedule.time}` : '' }}
          </p>
          <div class="text-[11px] font-semibold text-white mt-2 flex items-center gap-1.5 liquid-glass-pill px-2.5 py-1 rounded-lg w-max border-amber-500/30">
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            {{ timeRemaining }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
