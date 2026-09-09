<script setup lang="ts">
import { onMounted } from 'vue'
import { useBotStore } from '../stores/bot'
import { useAuthStore } from '../stores/auth'
import { useTheme } from '../composables/useTheme'
import { Github, Sun, Moon, LogOut, User } from 'lucide-vue-next'

const botStore = useBotStore()
const authStore = useAuthStore()
const { theme, init, toggle } = useTheme()

onMounted(() => {
  init()
  botStore.fetchBot()
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200 relative overflow-x-hidden">
    <!-- Fluid Liquid Ambient Blooms -->
    <div class="fixed -top-24 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/15 via-indigo-600/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0 liquid-orb-1"></div>
    <div class="fixed -bottom-24 right-1/4 w-[520px] h-[520px] bg-gradient-to-br from-cyan-600/10 via-blue-600/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0 liquid-orb-2"></div>
    <div class="fixed top-1/3 right-10 w-72 h-72 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

    <!-- Floating Liquid Glass Header -->
    <header class="relative z-30 liquid-glass border-b sticky top-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-md shadow-purple-500/20 ring-1 ring-white/20">
            <div class="w-full h-full rounded-[10px] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="TeleFlow logo" class="w-5 h-5 object-contain" />
            </div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-white leading-none">TELEFLOW</h1>
            <p class="text-[10px] text-slate-400 tracking-wider font-semibold mt-0.5">Bot Orchestration</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Bot Live Status Pill -->
          <div v-if="botStore.isOnline" class="hidden sm:flex items-center gap-2 liquid-glass-pill px-3 py-1.5 rounded-xl text-xs">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            </span>
            <span class="font-medium text-slate-200">
              {{ botStore.bot?.username ? `@${botStore.bot.username}` : 'Bot Active' }}
            </span>
          </div>

          <!-- Current User Pill -->
          <div v-if="authStore.user" class="flex items-center gap-2 liquid-glass-pill px-3 py-1.5 rounded-xl text-xs">
            <User class="w-3.5 h-3.5 text-slate-400" />
            <span class="font-medium text-slate-200">
              {{ authStore.user.username }}
            </span>
          </div>

          <!-- Theme Switcher Button -->
          <button
            @click="toggle"
            :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            class="p-2 text-slate-400 hover:text-white transition-all liquid-glass-pill hover:scale-105 active:scale-95 rounded-xl cursor-pointer"
          >
            <Sun v-if="theme === 'dark'" class="w-4 h-4 text-amber-400" />
            <Moon v-else class="w-4 h-4 text-indigo-400" />
          </button>

          <!-- GitHub Link -->
          <a
            href="https://github.com/NhebPanha/nn_panha_telegram_bot"
            target="_blank"
            class="p-2 text-slate-400 hover:text-white transition-all liquid-glass-pill hover:scale-105 active:scale-95 rounded-xl"
            title="GitHub Repository"
          >
            <Github class="w-4 h-4" />
          </a>

          <!-- Logout Button -->
          <button
            v-if="authStore.user"
            @click="authStore.logout()"
            title="Log out"
            class="p-2 text-rose-400 hover:text-rose-300 transition-all liquid-glass-pill hover:border-rose-500/30 hover:scale-105 active:scale-95 rounded-xl cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <main class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <footer class="relative z-10 border-t border-white/5 bg-slate-950/60 backdrop-blur-md py-6 text-center text-xs text-slate-400">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; 2026 TeleFlow Pro. Engineered by Nheb Panha. All rights reserved.</p>
        <div class="flex items-center gap-2 font-mono text-[10px]">
          <span class="liquid-glass-pill px-2.5 py-1 rounded-lg text-purple-300 border border-purple-500/20">v2.0.0 Pro Edition</span>
          <span class="liquid-glass-pill px-2.5 py-1 rounded-lg text-emerald-400 border border-emerald-500/20">Cloudflare Edge Ready</span>
        </div>
      </div>
    </footer>

    <ToastList />
  </div>
</template>
