<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { User, Lock, ArrowRight, Send, Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const toast = useToast()

const username = ref('')
const password = ref('')
const isLoading = ref(false)

const handleLogin = async () => {
  if (!username.value || !password.value) {
    toast.error('Please enter both username and password')
    return
  }

  isLoading.value = true
  try {
    await authStore.login(username.value, password.value)
    toast.success('Successfully logged in')
    navigateTo('/')
  } catch (err: any) {
    toast.error(err.statusMessage || 'Failed to login. Please check your credentials.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-purple-600/30 selection:text-purple-200 relative overflow-hidden">
    <!-- Fluid Liquid Ambient Blooms -->
    <div class="fixed -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0 liquid-orb-1"></div>
    <div class="fixed -bottom-20 right-1/4 w-[520px] h-[520px] bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0 liquid-orb-2"></div>

    <div class="relative z-10 w-full max-w-4xl liquid-glass-elevated rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
      <!-- Left: Brand Panel -->
      <div class="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-purple-950/30 via-slate-900/40 to-slate-950/60 border-r border-white/10 relative">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-md shadow-purple-500/25 ring-1 ring-white/20">
            <div class="w-full h-full rounded-[10px] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
              <Send class="w-4 h-4 text-white transform rotate-[15deg] -translate-x-0.5 -translate-y-0.5" />
            </div>
          </div>
          <div>
            <h1 class="text-sm font-bold tracking-wider text-white">TELEFLOW PRO</h1>
            <p class="text-[9px] text-slate-400 uppercase font-semibold">Bot Orchestration</p>
          </div>
        </div>

        <div class="space-y-4">
          <h2 class="text-2xl font-bold text-white leading-tight">
            Automated Telegram broadcasts and group moderation.
          </h2>
          <p class="text-slate-300 text-sm leading-relaxed">
            Manage multiple bots, run automated daily messaging campaigns, monitor system health, and secure moderation logs from a unified dashboard.
          </p>
        </div>

        <div class="text-[10px] text-slate-400 font-mono liquid-glass-pill px-3 py-1.5 rounded-lg w-max">
          &copy; 2026 TeleFlow System. Secure encryption active.
        </div>
      </div>

      <!-- Right: Form Panel -->
      <div class="p-8 md:p-10 flex flex-col justify-center bg-slate-900/30 backdrop-blur-md">
        <!-- Mobile Logo Header -->
        <div class="flex items-center gap-3 md:hidden mb-8">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5">
            <div class="w-full h-full rounded-md bg-slate-950/40 flex items-center justify-center">
              <Send class="w-3.5 h-3.5 text-white transform rotate-[15deg] -translate-x-0.5 -translate-y-0.5" />
            </div>
          </div>
          <div>
            <h1 class="text-xs font-bold tracking-wider text-white">TELEFLOW PRO</h1>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="text-xl font-bold text-white">Welcome back</h3>
          <p class="text-xs text-slate-400 mt-1">Sign in to your administration panel</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
            <div class="relative">
              <User class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                v-model="username"
                type="text"
                placeholder="admin"
                class="w-full liquid-glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="w-full liquid-glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full liquid-glass-button disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
            <template v-else>
              <span>Sign In</span>
              <ArrowRight class="w-4 h-4" />
            </template>
          </button>
        </form>
      </div>
    </div>
    
    <ToastList />
  </div>
</template>
