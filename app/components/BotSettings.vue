<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBotStore } from '../stores/bot'
import { useGroupsStore } from '../stores/groups'
import { useToast } from '../composables/useToast'
import { Key, Send, RefreshCw, Eye, EyeOff, ShieldCheck } from 'lucide-vue-next'

defineProps<{
  sidebar?: boolean
}>()

const botStore = useBotStore()
const groupsStore = useGroupsStore()
const toast = useToast()

const tokenInput = ref('')
const showToken = ref(false)

const isTesting = ref(false)
const testChatId = ref('')
const testMessageContent = ref('')

onMounted(async () => {
  await botStore.fetchBot()
  await groupsStore.fetchGroups()
})

const handleSaveToken = async () => {
  if (!tokenInput.value.trim()) {
    toast.error('Token cannot be empty')
    return
  }
  try {
    const res = await botStore.saveBotToken(tokenInput.value.trim())
    if (res.success) {
      toast.success('Bot Token saved and encrypted successfully!')
      tokenInput.value = ''
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to save token')
  }
}

const handleVerifyBot = async () => {
  try {
    const res = await botStore.verifyBot()
    if (res.success) {
      toast.success(`Verified! Connected to @${res.botInfo.username}`)
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Verification failed. Double check your token.')
  }
}

const handleSendTest = async () => {
  if (!testChatId.value) {
    toast.error('Please select a group first')
    return
  }
  
  isTesting.value = true
  try {
    const res = await botStore.testMessage(testChatId.value, testMessageContent.value)
    if (res.success) {
      toast.success('Test message sent successfully!')
      testMessageContent.value = ''
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to send test message')
  } finally {
    isTesting.value = false
  }
}
</script>

<template>
  <div :class="sidebar ? 'flex flex-col gap-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'">
    <!-- Left: Configure Bot Token -->
    <div :class="sidebar ? 'w-full' : 'lg:col-span-7'" class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Key class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Bot Configuration</h3>
            <p class="text-xs text-slate-400">Connect and manage your Telegram Bot instance</p>
          </div>
        </div>

        <form @submit.prevent="handleSaveToken" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Telegram Bot Token</label>
            <div class="relative rounded-xl overflow-hidden shadow-inner">
              <input
                :type="showToken ? 'text' : 'password'"
                v-model="tokenInput"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-600 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none transition-all pr-12"
              />
              <button
                type="button"
                @click="showToken = !showToken"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <EyeOff v-if="showToken" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
            <p class="text-[11px] text-slate-500 mt-2">
              Note: Tokens are encrypted using AES-256-CBC before storage.
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="botStore.isLoading"
              class="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-3 px-4 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw v-if="botStore.isLoading" class="w-4 h-4 animate-spin" />
              Save Token
            </button>
            <button
              v-if="botStore.exists"
              type="button"
              @click="handleVerifyBot"
              :disabled="botStore.isLoading"
              class="flex-1 bg-slate-800 border border-slate-700/60 text-slate-200 hover:bg-slate-750 text-sm font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50"
            >
              <ShieldCheck class="w-4 h-4 text-emerald-400" />
              Verify Connection
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Right: Connection Status & Test Dispatcher -->
    <div :class="sidebar ? 'w-full' : 'lg:col-span-5'" class="flex flex-col gap-6">
      <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Connection Details</h3>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span class="text-sm text-slate-400">Connection Status</span>
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
              :class="botStore.exists ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="botStore.exists ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'"></span>
              {{ botStore.exists ? 'Connected' : 'Disconnected' }}
            </span>
          </div>

          <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span class="text-sm text-slate-400">Bot Username</span>
            <span class="text-sm font-semibold text-white font-mono">
              {{ botStore.username ? `@${botStore.username}` : 'Not Connected' }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-400">Webhook Status</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
              Disabled (Polling-Mode)
            </span>
          </div>
        </div>
      </div>

      <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Test Dispatcher</h3>

        <div class="space-y-3">
          <div>
            <select
              v-model="testChatId"
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2 px-3 text-sm focus:outline-none transition-all"
            >
              <option value="">Select Target Group...</option>
              <option v-for="g in groupsStore.groups" :key="g.id" :value="g.chatId">
                {{ g.name }}
              </option>
            </select>
          </div>

          <div class="relative">
            <input
              type="text"
              v-model="testMessageContent"
              placeholder="Enter test message (optional)..."
              class="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500 text-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-none pr-10"
              @keyup.enter="handleSendTest"
            />
            <button
              @click="handleSendTest"
              :disabled="isTesting || !botStore.exists || !testChatId"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors p-1"
            >
              <RefreshCw v-if="isTesting" class="w-4 h-4 animate-spin" />
              <Send v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
