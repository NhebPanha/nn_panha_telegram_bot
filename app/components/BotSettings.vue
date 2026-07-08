<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBotStore } from '../stores/bot'
import { useGroupsStore } from '../stores/groups'
import { useToast } from '../composables/useToast'
import { Key, Send, RefreshCw, Eye, EyeOff, ShieldCheck, Trash2, Cpu, Check, X, ShieldAlert } from 'lucide-vue-next'

defineProps<{
  sidebar?: boolean
}>()

const botStore = useBotStore()
const groupsStore = useGroupsStore()
const toast = useToast()

const tokenInput = ref('')
const showToken = ref(false)

const isTesting = ref(false)
const testBotId = ref<string>('')
const testChatId = ref('')
const testMessageContent = ref('')

onMounted(async () => {
  await botStore.fetchBots()
  await groupsStore.fetchGroups()
})

const handleSaveToken = async () => {
  if (!tokenInput.value.trim()) {
    toast.error('Token cannot be empty')
    return
  }
  try {
    const res = await botStore.addBot(tokenInput.value.trim())
    if (res.success) {
      toast.success(`Bot @${res.bot.username} added and verified successfully!`)
      tokenInput.value = ''
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to save bot token')
  }
}

const handleVerifyBot = async (id: number) => {
  try {
    const res = await botStore.verifyBot(id)
    if (res.success) {
      toast.success(`Bot verified successfully! Connected as @${res.bot.username}`)
    } else {
      toast.error(`Verification failed. Bot offline: ${res.message}`)
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Verification failed. Double check your token.')
  }
}

const handleToggleBot = async (id: number, currentActive: boolean) => {
  try {
    await botStore.toggleBotStatus(id, !currentActive)
    toast.success('Bot status updated')
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to update bot status')
  }
}

const handleDeleteBot = async (id: number) => {
  if (!confirm('Are you sure you want to delete this bot? This will also remove any schedules configured for this bot.')) {
    return
  }
  try {
    await botStore.deleteBot(id)
    toast.success('Bot deleted successfully')
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to delete bot')
  }
}

const handleSendTest = async () => {
  if (!testBotId.value) {
    toast.error('Please select a bot first')
    return
  }
  if (!testChatId.value) {
    toast.error('Please select a target group first')
    return
  }
  if (!testMessageContent.value.trim()) {
    toast.error('Message content cannot be empty')
    return
  }

  isTesting.value = true
  try {
    const res = await botStore.testMessage(parseInt(testBotId.value, 10), testChatId.value, testMessageContent.value.trim())
    if (res.success) {
      toast.success('Test message sent and logged successfully!')
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
    <!-- Left: Configure Bot Token & Bots List -->
    <div :class="sidebar ? 'w-full' : 'lg:col-span-8'" class="space-y-6">
      
      <!-- Bot Registration Card -->
      <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Key class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Add Telegram Bot</h3>
            <p class="text-xs text-slate-400">Register new Telegram bot credentials securely</p>
          </div>
        </div>

        <form @submit.prevent="handleSaveToken" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Telegram Bot Token</label>
            <div class="relative rounded-xl overflow-hidden shadow-inner">
              <input
                :type="showToken ? 'text' : 'password'"
                v-model="tokenInput"
                placeholder="8564410304:AAHSjsCHbrha09fWkfkqfFX3ioWtXpSJoZg"
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
              Note: Tokens are encrypted using AES-256-CBC and stored locally inside <code class="text-xs text-purple-300">data/bots.json</code>.
            </p>
          </div>

          <div class="pt-1">
            <button
              type="submit"
              :disabled="botStore.isLoading"
              class="w-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-3 px-4 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw v-if="botStore.isLoading" class="w-4 h-4 animate-spin" />
              Add & Register Bot
            </button>
          </div>
        </form>
      </div>

      <!-- Bots Registry List Table -->
      <div v-if="!sidebar" class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Cpu class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Registered Bot Instances</h3>
            <p class="text-xs text-slate-400">View status, check API permissions, and disable instances</p>
          </div>
        </div>

        <div v-if="botStore.bots.length === 0" class="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          No bots registered yet. Add one using the form above.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th class="pb-3">Bot Name</th>
                <th class="pb-3">Username</th>
                <th class="pb-3">API Status</th>
                <th class="pb-3">Bot Permissions</th>
                <th class="pb-3">Active</th>
                <th class="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in botStore.bots" :key="b.id" class="border-b border-slate-850 hover:bg-slate-800/20 transition-all">
                <td class="py-3.5 font-semibold text-white">{{ b.firstName }}</td>
                <td class="py-3.5 text-slate-400">
                  <a :href="`https://t.me/${b.username}`" target="_blank" class="hover:text-purple-400 transition-colors">
                    @{{ b.username }}
                  </a>
                </td>
                <td class="py-3.5">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-max"
                    :class="b.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
                  >
                    <span class="h-1 w-1 rounded-full" :class="b.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'"></span>
                    {{ b.status }}
                  </span>
                </td>
                <td class="py-3.5 text-xs">
                  <div class="flex flex-col gap-0.5 text-slate-500">
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full" :class="b.permissions?.can_join_groups ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                      Join Groups
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full" :class="b.permissions?.can_read_all_group_messages ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                      Read Messages
                    </span>
                  </div>
                </td>
                <td class="py-3.5">
                  <button
                    @click="handleToggleBot(b.id, b.active)"
                    class="w-10 h-6 rounded-full p-0.5 transition-all outline-none"
                    :class="b.active ? 'bg-purple-600 flex justify-end' : 'bg-slate-800 flex justify-start'"
                  >
                    <span class="bg-white w-5 h-5 rounded-full shadow-md"></span>
                  </button>
                </td>
                <td class="py-3.5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="handleVerifyBot(b.id)"
                      class="p-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                      title="Verify Bot Connection"
                    >
                      <ShieldCheck class="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      @click="handleDeleteBot(b.id)"
                      class="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Delete Bot"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Right: Test Dispatcher -->
    <div :class="sidebar ? 'w-full' : 'lg:col-span-4'" class="space-y-6">
      
      <!-- Quick Info / Logs Stats -->
      <div v-if="sidebar && botStore.bots.length > 0" class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Bots Overview</h3>
        <div class="space-y-3">
          <div v-for="b in botStore.bots" :key="b.id" class="flex items-center justify-between border-b border-slate-800/60 pb-2.5 last:border-0 last:pb-0">
            <div class="truncate pr-2">
              <p class="text-sm font-semibold text-white truncate">{{ b.firstName }}</p>
              <p class="text-xs text-slate-400 font-mono">@{{ b.username }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="b.active && b.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'"></span>
              <button @click="handleVerifyBot(b.id)" class="text-xs text-purple-400 hover:text-purple-300">Verify</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Dispatcher Card -->
      <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Send class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">Test Dispatcher</h3>
            <p class="text-xs text-slate-400">Send direct manual messages to groups</p>
          </div>
        </div>

        <div class="space-y-3">
          <!-- Bot Selector -->
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Select Bot</label>
            <select
              v-model="testBotId"
              class="w-full bg-slate-950/80 border border-slate-850 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none transition-all"
            >
              <option value="">Select dispatch bot...</option>
              <option v-for="b in botStore.activeBots" :key="b.id" :value="String(b.id)">
                {{ b.firstName }} (@{{ b.username }})
              </option>
            </select>
          </div>

          <!-- Target Selector -->
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Target Destination</label>
            <select
              v-model="testChatId"
              class="w-full bg-slate-950/80 border border-slate-850 focus:border-purple-500 text-white rounded-xl py-2.5 px-3 text-sm focus:outline-none transition-all"
            >
              <option value="">Select target destination...</option>
              <option v-for="g in groupsStore.groups" :key="g.id" :value="g.chatId">
                [{{ g.type.toUpperCase() }}] {{ g.name }}
              </option>
            </select>
          </div>

          <!-- Message Text -->
          <div>
            <label class="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Message Content</label>
            <div class="relative">
              <textarea
                v-model="testMessageContent"
                placeholder="Write test message here (HTML mode)..."
                rows="3"
                class="w-full bg-slate-950/80 border border-slate-850 focus:border-purple-500 text-white rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none pr-10"
              ></textarea>
              <button
                @click="handleSendTest"
                :disabled="isTesting || !testBotId || !testChatId || !testMessageContent"
                class="absolute right-2.5 bottom-3.5 text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors p-1"
              >
                <RefreshCw v-if="isTesting" class="w-4 h-4 animate-spin" />
                <Send v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
