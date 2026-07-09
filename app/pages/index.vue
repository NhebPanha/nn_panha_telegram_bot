<script setup lang="ts">
import { ref } from 'vue'
import { LayoutDashboard, Settings, Users, CalendarRange, ListTodo, ShieldAlert } from 'lucide-vue-next'

const activeTab = ref('dashboard')

const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'bot', name: 'Bot Settings', icon: Settings },
  { id: 'groups', name: 'Groups', icon: Users },
  { id: 'schedules', name: 'Schedules', icon: CalendarRange },
  { id: 'moderation', name: 'Moderation', icon: ShieldAlert },
  { id: 'logs', name: 'Logs', icon: ListTodo }
]
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
          System Panel
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Welcome back, administrator. Manage group broadcasts and automated triggers.
        </p>
      </div>

      <nav class="flex bg-slate-900/60 border border-slate-850 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap"
          :class="activeTab === tab.id ? 'bg-purple-600 text-white shadow shadow-purple-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'"
        >
          <component :is="tab.icon" class="w-4.5 h-4.5" />
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <div class="space-y-6">
      <div v-if="activeTab === 'dashboard'" class="space-y-8">
        <DashboardStats />
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div class="lg:col-span-8">
            <LogViewer />
          </div>
          <div class="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <BotSettings sidebar />
          </div>
        </div>
      </div>
      
      <div v-else-if="activeTab === 'bot'">
        <BotSettings />
      </div>

      <div v-else-if="activeTab === 'groups'">
        <GroupManager />
      </div>

      <div v-else-if="activeTab === 'schedules'">
        <ScheduleManager />
      </div>

      <div v-else-if="activeTab === 'moderation'">
        <ModerationManager />
      </div>

      <div v-else-if="activeTab === 'logs'">
        <LogViewer />
      </div>
    </div>
  </div>
</template>
