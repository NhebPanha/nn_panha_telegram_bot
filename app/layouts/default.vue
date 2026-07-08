<script setup lang="ts">
import { onMounted } from 'vue'
import { useBotStore } from '../stores/bot'
import { Send, Github } from 'lucide-vue-next'

const botStore = useBotStore()

onMounted(() => {
  botStore.fetchBots()
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-200">
    <div class="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
    <div class="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

    <header class="relative z-10 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Send class="w-4 h-4 text-white transform rotate-[15deg] -translate-x-0.5 -translate-y-0.5" />
          </div>
          <div>
            <h1 class="text-base font-black tracking-tight text-white leading-none">TELEFLOW</h1>
            <p class="text-[10px] text-slate-500 tracking-widest uppercase font-bold mt-1">Bot Management</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div v-if="botStore.activeBots.length > 0" class="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="font-medium text-slate-300">
              {{ botStore.activeBots[0].username ? `@${botStore.activeBots[0].username}` : 'Bot Active' }}
              <span v-if="botStore.activeBots.length > 1" class="text-[10px] text-slate-500 ml-1">
                (+{{ botStore.activeBots.length - 1 }})
              </span>
            </span>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            class="p-2 text-slate-500 hover:text-slate-300 transition-colors border border-slate-900 hover:border-slate-800 bg-slate-950/40 rounded-xl"
          >
            <Github class="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>

    <main class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <footer class="relative z-10 border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>&copy; 2026 TeleFlow System. All rights reserved.</p>
        <p class="font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
          Local: 2026-07-07T13:25:19
        </p>
      </div>
    </footer>

    <ToastList />
  </div>
</template>
