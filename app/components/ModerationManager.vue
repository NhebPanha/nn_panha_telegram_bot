<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useModerationStore } from '../stores/moderation'
import { useBotStore } from '../stores/bot'
import { useWebhookStore } from '../stores/webhook'
import { useToast } from '../composables/useToast'
import { ShieldAlert, Link2, Sticker, AlertCircle, Power, Webhook, RefreshCw, FileX, ChevronDown, ChevronUp, Check, X } from 'lucide-vue-next'

const moderationStore = useModerationStore()
const botStore = useBotStore()
const webhookStore = useWebhookStore()
const toast = useToast()

const showExtensionsList = ref(true)

const restrictedExtensions = [
  '.exe', '.bat', '.vbs', '.ps1', '.sh', '.msi',
  '.scr', '.docm', '.xlsm', '.pptm', '.rtf',
  '.pdf', '.lnk', '.hta', '.cpl', '.js', '.jse',
  '.wsf', '.cmd', '.py', '.iso', '.img', '.vhd',
  '.elf', '.dmg', '.pkg', '.apk', '.zip', '.rar', '.7z'
]

onMounted(async () => {
  await moderationStore.fetchSettings()
  await botStore.fetchBot()
  await webhookStore.fetchInfo()
})

const handleSetupWebhook = async () => {
  try {
    const res = await webhookStore.setup()
    if (res.success) toast.success(`Webhook registered: ${res.url}`)
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to register webhook')
  }
}

const toggle = async (key: 'enabled' | 'deleteLinks' | 'deleteStickers' | 'deleteFiles') => {
  const next = !moderationStore.settings[key]
  try {
    await moderationStore.updateSettings({ [key]: next })
    const labels: Record<string, string> = {
      enabled: 'Auto-moderation',
      deleteLinks: 'Delete links',
      deleteStickers: 'Delete stickers',
      deleteFiles: 'Delete restricted files'
    }
    toast.success(`${labels[key]} ${next ? 'enabled' : 'disabled'}`)
  } catch {
    toast.error('Failed to update moderation setting')
  }
}

const isExtensionBlocked = (ext: string) => {
  const clean = ext.replace(/^\./, '').toLowerCase()
  const list = moderationStore.settings.blockedExtensions
  if (!list || !Array.isArray(list) || list.length === 0) {
    // Default to active if blockedExtensions not set yet
    return true
  }
  return list.includes(clean)
}

const toggleExtension = async (ext: string) => {
  const clean = ext.replace(/^\./, '').toLowerCase()
  const list = moderationStore.settings.blockedExtensions || restrictedExtensions.map(e => e.replace(/^\./, '').toLowerCase())
  const currentList = [...list]
  const idx = currentList.indexOf(clean)
  
  if (idx > -1) {
    currentList.splice(idx, 1)
  } else {
    currentList.push(clean)
  }

  try {
    await moderationStore.updateSettings({ blockedExtensions: currentList })
    const state = currentList.includes(clean) ? 'blocked (auto-delete)' : 'allowed'
    toast.success(`Rule for ${ext}: ${state}`)
  } catch {
    toast.error(`Failed to update rule for ${ext}`)
  }
}

const toggleAllExtensions = async (enable: boolean) => {
  const allClean = restrictedExtensions.map(e => e.replace(/^\./, '').toLowerCase())
  const newList = enable ? allClean : []
  try {
    await moderationStore.updateSettings({ blockedExtensions: newList })
    toast.success(enable ? 'All file extension rules enabled' : 'All file extension rules disabled')
  } catch {
    toast.error('Failed to update extension rules')
  }
}

const activeCount = computed(() => {
  return restrictedExtensions.filter(ext => isExtensionBlocked(ext)).length
})
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
        <p class="text-xs text-slate-400">Let the bot automatically delete links, stickers, and executable/restricted files in your groups</p>
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

    <!-- Webhook connection -->
    <div class="bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <div
            class="p-2 rounded-lg"
            :class="webhookStore.info.configured ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700/60'"
          >
            <Webhook class="w-4 h-4" />
          </div>
          <div>
            <p class="text-sm font-bold text-white">Telegram Webhook</p>
            <p class="text-xs text-slate-400">
              {{ webhookStore.info.configured ? 'Connected — Telegram is pushing updates here' : 'Not connected — moderation and auto-discovery are inactive' }}
            </p>
          </div>
        </div>
        <button
          @click="handleSetupWebhook"
          :disabled="webhookStore.isLoading || !botStore.isConfigured"
          class="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold py-2 px-3.5 rounded-lg transition-all flex items-center gap-2"
        >
          <RefreshCw v-if="webhookStore.isLoading" class="w-3.5 h-3.5 animate-spin" />
          {{ webhookStore.info.configured ? 'Re-register' : 'Register Webhook' }}
        </button>
      </div>

      <p v-if="webhookStore.info.url" class="text-[10px] text-slate-500 font-mono break-all">
        {{ webhookStore.info.url }}
      </p>
      <p v-if="webhookStore.info.lastError" class="text-[11px] text-rose-400">
        Last error: {{ webhookStore.info.lastError }}
      </p>
      <p class="text-[11px] text-slate-500">
        Requires a public HTTPS URL — register this after deploying. Telegram cannot reach localhost.
      </p>
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

      <!-- Delete restricted files -->
      <div class="sm:col-span-2 bg-slate-950/40 border border-slate-850 rounded-xl p-4 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
              <FileX class="w-4 h-4" />
            </div>
            <div>
              <p class="text-sm font-bold text-white">Delete Restricted Files</p>
              <p class="text-xs text-slate-400">Removes file attachments with dangerous or blocked extensions</p>
            </div>
          </div>
          <button
            @click="toggle('deleteFiles')"
            class="w-11 h-6 rounded-full p-0.5 transition-all outline-none flex-shrink-0"
            :class="moderationStore.settings.deleteFiles ? 'bg-purple-600 flex justify-end' : 'bg-slate-800 flex justify-start'"
          >
            <span class="bg-white w-5 h-5 rounded-full shadow-md"></span>
          </button>
        </div>

        <div class="pt-3 border-t border-slate-800/60 space-y-3" :class="{ 'opacity-50 pointer-events-none': !moderationStore.settings.deleteFiles }">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <p class="text-[11px] font-semibold text-slate-300">
                File Extension Rules ({{ activeCount }} / {{ restrictedExtensions.length }} blocked)
              </p>
              <span class="text-[10px] text-slate-500 font-mono">(Click extension to toggle ON/OFF)</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="toggleAllExtensions(true)"
                class="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                Block All
              </button>
              <button
                @click="toggleAllExtensions(false)"
                class="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750 transition-all"
              >
                Allow All
              </button>
              <button
                @click="showExtensionsList = !showExtensionsList"
                class="text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors outline-none cursor-pointer ml-1"
              >
                <span>{{ showExtensionsList ? 'Close list' : 'View list' }}</span>
                <ChevronUp v-if="showExtensionsList" class="w-3.5 h-3.5" />
                <ChevronDown v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Interactive File Extension Toggle Pills -->
          <div v-if="showExtensionsList" class="flex flex-wrap gap-1.5 pt-1">
            <button
              v-for="ext in restrictedExtensions"
              :key="ext"
              @click="toggleExtension(ext)"
              type="button"
              class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all flex items-center gap-1.5 outline-none cursor-pointer"
              :class="isExtensionBlocked(ext) 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-sm' 
                : 'bg-slate-900/80 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400 opacity-65'"
              :title="isExtensionBlocked(ext) ? `Click to ALLOW ${ext} files` : `Click to BLOCK ${ext} files`"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="isExtensionBlocked(ext) ? 'bg-rose-400' : 'bg-slate-600'"></span>
              <span>{{ ext }}</span>
              <X v-if="isExtensionBlocked(ext)" class="w-2.5 h-2.5 text-rose-400" />
              <Check v-else class="w-2.5 h-2.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="text-[11px] text-slate-500">
      Deleted messages are recorded in the <span class="text-slate-300 font-semibold">Logs</span> tab. Moderation applies to every group the bot administrates.
    </p>
  </div>
</template>
