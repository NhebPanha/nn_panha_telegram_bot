<script setup lang="ts">
import { onMounted } from 'vue'
import { useModerationStore } from '../stores/moderation'
import { useBotStore } from '../stores/bot'
import { useToast } from '../composables/useToast'
import { ShieldAlert, Link2, Sticker, AlertCircle, Power } from 'lucide-vue-next'

const moderationStore = useModerationStore()
const botStore = useBotStore()
const toast = useToast()

onMounted(async () => {
  await moderationStore.fetchSettings()
  await botStore.fetchBot()
})

const toggle = async (key: 'enabled' | 'deleteLinks' | 'deleteStickers') => {
  const next = !moderationStore.settings[key]
  try {
    await moderationStore.updateSettings({ [key]: next })
    const labels: Record<string, string> = {
      enabled: 'Auto-moderation',
      deleteLinks: 'Delete links',
      deleteStickers: 'Delete stickers'
    }
    toast.success(`${labels[key]} ${next ? 'enabled' : 'disabled'}`)
  } catch {
    toast.error('Failed to update moderation setting')
  }
}
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
        <ShieldAlert class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-white">Auto-Moderation</h3>
        <p class="text-xs text-slate-400">Let the bot automatically delete links and stickers in your groups</p>
      </div>
    </div>

    <!-- Requirements note -->
    <div class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 flex items-start gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div class="text-xs text-slate-300 space-y-1">
        <p class="font-bold text-amber-400">For moderation to work, the bot must:</p>
        <ul class="list-disc list-inside space-y-0.5 text-slate-400">
          <li>Be an <span class="text-slate-200 font-semibold">admin</span> in the group with the <span class="text-slate-200 font-semibold">"Delete messages"</span> permission.</li>
          <li>Have <span class="text-slate-200 font-semibold">privacy mode disabled</span> (BotFather → <code class="text-rose-300">/setprivacy</code> → Disable) so it can see all messages.</li>
        </ul>
        <p v-if="!botStore.isConfigured" class="text-rose-400 font-semibold pt-1">No bot configured — add one in Bot Settings first.</p>
      </div>
    </div>

    <!-- Master toggle -->
    <div class="flex items-center justify-between bg-slate-950/40 border border-slate-850 rounded-xl p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg" :class="moderationStore.settings.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700/60'">
          <Power class="w-4 h-4" />
        </div>
        <div>
          <p class="text-sm font-bold text-white">Enable Auto-Moderation</p>
          <p class="text-xs text-slate-400">Master switch — watches incoming group messages</p>
        </div>
      </div>
      <button
        @click="toggle('enabled')"
        class="w-11 h-6 rounded-full p-0.5 transition-all outline-none flex-shrink-0"
        :class="moderationStore.settings.enabled ? 'bg-emerald-600 flex justify-end' : 'bg-slate-800 flex justify-start'"
      >
        <span class="bg-white w-5 h-5 rounded-full shadow-md"></span>
      </button>
    </div>

    <!-- Rule toggles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" :class="{ 'opacity-50 pointer-events-none': !moderationStore.settings.enabled }">
      <!-- Delete links -->
      <div class="flex items-center justify-between bg-slate-950/40 border border-slate-850 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Link2 class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-bold text-white">Delete Links</p>
            <p class="text-xs text-slate-400">Removes messages containing URLs</p>
          </div>
        </div>
        <button
          @click="toggle('deleteLinks')"
          class="w-11 h-6 rounded-full p-0.5 transition-all outline-none flex-shrink-0"
          :class="moderationStore.settings.deleteLinks ? 'bg-purple-600 flex justify-end' : 'bg-slate-800 flex justify-start'"
        >
          <span class="bg-white w-5 h-5 rounded-full shadow-md"></span>
        </button>
      </div>

      <!-- Delete stickers -->
      <div class="flex items-center justify-between bg-slate-950/40 border border-slate-850 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-violet-400">
            <Sticker class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-bold text-white">Delete Stickers</p>
            <p class="text-xs text-slate-400">Removes sticker messages</p>
          </div>
        </div>
        <button
          @click="toggle('deleteStickers')"
          class="w-11 h-6 rounded-full p-0.5 transition-all outline-none flex-shrink-0"
          :class="moderationStore.settings.deleteStickers ? 'bg-purple-600 flex justify-end' : 'bg-slate-800 flex justify-start'"
        >
          <span class="bg-white w-5 h-5 rounded-full shadow-md"></span>
        </button>
      </div>
    </div>

    <p class="text-[11px] text-slate-500">
      Deleted messages are recorded in the <span class="text-slate-300 font-semibold">Logs</span> tab. Moderation applies to every group the bot administrates.
    </p>
  </div>
</template>
