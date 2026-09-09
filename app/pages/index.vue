<script setup lang="ts">
import { ref } from 'vue'
import { LayoutDashboard, Settings, Users, CalendarRange, ListTodo, ShieldAlert, MessagesSquare, Sparkles } from 'lucide-vue-next'

const activeTab = ref('dashboard')

const tabs = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'bot', name: 'Bot Settings', icon: Settings },
  { id: 'groups', name: 'Groups', icon: Users },
  { id: 'chat', name: 'Chat', icon: MessagesSquare },
  { id: 'ai', name: 'AI Reply', icon: Sparkles },
  { id: 'schedules', name: 'Schedules', icon: CalendarRange },
  { id: 'moderation', name: 'Moderation', icon: ShieldAlert },
  { id: 'logs', name: 'Logs', icon: ListTodo }
]
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          System Panel
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Welcome back, administrator. Manage group broadcasts and automated triggers.
        </p>
      </div>

      <!-- Floating Liquid Glass Tab Navigation -->
      <nav class="flex items-center liquid-glass p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="group flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap select-none shrink-0 cursor-pointer"
          :class="activeTab === tab.id 
            ? 'liquid-glass-button text-white font-bold ring-1 ring-white/25' 
            : 'text-slate-400 hover:text-white hover:bg-white/5 active:scale-95'"
        >
          <component 
            :is="tab.icon" 
            class="w-4 h-4 transition-all duration-200" 
            :class="activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'"
          />
          <span>{{ tab.name }}</span>
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

      <div v-else-if="activeTab === 'chat'">
        <GroupChat />
      </div>

      <div v-else-if="activeTab === 'ai'">
        <AiSettings />
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
