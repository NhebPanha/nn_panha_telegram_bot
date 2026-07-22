<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useGroupsStore } from '../stores/groups'
import { useChatStore, type ReplyTarget, type ChatMessage } from '../stores/chat'
import { useToast } from '../composables/useToast'
import { Send, Users, RefreshCw, Search, Crown, Shield, Bot, MessageSquare, ArrowLeft, Reply, X } from 'lucide-vue-next'

const groupsStore = useGroupsStore()
const chatStore = useChatStore()
const toast = useToast()

const activeGroupId = ref<string | null>(null)
const draft = ref('')
const searchQuery = ref('')
const showMembers = ref(true)
const replyingTo = ref<ReplyTarget | null>(null)
const messagesEnd = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const activeGroup = computed(() => groupsStore.groups.find(g => g.id === activeGroupId.value) || null)

// Only real chats can host a conversation (channels are broadcast-only, no members thread)
const chatList = computed(() =>
  groupsStore.groups.filter(g => {
    const matches = g.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    g.chatId.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matches
  })
)

const scrollToBottom = async () => {
  await nextTick()
  messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

const loadChat = async (id: string) => {
  activeGroupId.value = id
  replyingTo.value = null
  chatStore.reset()
  await Promise.all([chatStore.fetchMessages(id), chatStore.fetchMembers(id)])
  await scrollToBottom()
}

const startReply = (msg: ChatMessage) => {
  if (!msg.messageId) {
    toast.error('This message can no longer be replied to.')
    return
  }
  replyingTo.value = { messageId: msg.messageId, name: msg.fromName, text: msg.text }
}

const cancelReply = () => {
  replyingTo.value = null
}

const refresh = async () => {
  if (!activeGroupId.value) return
  await Promise.all([
    chatStore.fetchMessages(activeGroupId.value),
    chatStore.fetchMembers(activeGroupId.value)
  ])
}

const handleSend = async () => {
  const text = draft.value.trim()
  if (!text || !activeGroupId.value) return
  const groupId = activeGroupId.value
  const replyTo = replyingTo.value
  draft.value = ''
  replyingTo.value = null
  try {
    await chatStore.sendMessage(groupId, text, replyTo)
    await scrollToBottom()
  } catch (error: any) {
    draft.value = text
    replyingTo.value = replyTo
    toast.error(error.statusMessage || 'Failed to send message')
  }
}

const memberDisplayName = (m: any) =>
  [m.firstName, m.lastName].filter(Boolean).join(' ') || (m.username ? `@${m.username}` : `User ${m.userId}`)

const initials = (name: string) =>
  name.replace(/^@/, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'

// Deterministic avatar color from a numeric id
const avatarColor = (id: number | null) => {
  const palette = [
    'bg-purple-500/20 text-purple-300',
    'bg-cyan-500/20 text-cyan-300',
    'bg-emerald-500/20 text-emerald-300',
    'bg-amber-500/20 text-amber-300',
    'bg-rose-500/20 text-rose-300',
    'bg-blue-500/20 text-blue-300'
  ]
  return palette[Math.abs(id ?? 0) % palette.length]
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatSeen = (iso: string) => new Date(iso).toLocaleString()

watch(() => chatStore.messages.length, scrollToBottom)

onMounted(async () => {
  if (groupsStore.groups.length === 0) await groupsStore.fetchGroups()
  // Auto-refresh the open conversation every 8s to pull in new messages
  pollTimer = setInterval(refresh, 8000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
    <div class="grid grid-cols-1 lg:grid-cols-12 h-[640px]">
      <!-- Sidebar: chat list -->
      <aside
        class="lg:col-span-3 border-r border-slate-800/80 flex flex-col min-h-0"
        :class="activeGroupId ? 'hidden lg:flex' : 'flex'"
      >
        <div class="p-4 border-b border-slate-800/80">
          <h3 class="text-sm font-bold text-white mb-3">Chats</h3>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search chats..."
              class="w-full bg-slate-950/60 border border-slate-850 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl py-2 px-9 text-xs focus:outline-none"
            />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="chatList.length === 0" class="p-6 text-center text-xs text-slate-500">
            No chats yet. Add groups in the Groups tab, or the bot will auto-discover them when added to a chat.
          </div>
          <button
            v-for="g in chatList"
            :key="g.id"
            @click="loadChat(g.id)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-850/60 transition-colors"
            :class="activeGroupId === g.id ? 'bg-purple-600/10' : 'hover:bg-slate-800/30'"
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" :class="avatarColor(Number(g.chatId))">
              {{ initials(g.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white truncate">{{ g.name }}</p>
              <p class="text-[10px] text-slate-500 font-mono truncate">{{ g.chatId }} · {{ g.type }}</p>
            </div>
          </button>
        </div>
      </aside>

      <!-- Main conversation -->
      <section
        class="lg:col-span-6 flex flex-col min-h-0"
        :class="activeGroupId ? 'flex' : 'hidden lg:flex'"
      >
        <!-- Empty state -->
        <div v-if="!activeGroup" class="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div class="p-4 bg-slate-950/60 rounded-full border border-slate-800 text-slate-500 mb-4">
            <MessageSquare class="w-8 h-8" />
          </div>
          <h4 class="text-base font-bold text-slate-200">Select a chat</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-xs">
            Pick a group to view its conversation and members, and send messages like Telegram.
          </p>
        </div>

        <template v-else>
          <!-- Conversation header -->
          <header class="flex items-center gap-3 px-4 py-3 border-b border-slate-800/80">
            <button @click="activeGroupId = null" class="lg:hidden p-1.5 text-slate-400 hover:text-white">
              <ArrowLeft class="w-4 h-4" />
            </button>
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" :class="avatarColor(Number(activeGroup.chatId))">
              {{ initials(activeGroup.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-white truncate">{{ activeGroup.name }}</p>
              <p class="text-[10px] text-slate-500">
                {{ chatStore.totalCount !== null ? chatStore.totalCount + ' members' : chatStore.members.length + ' known' }}
              </p>
            </div>
            <button @click="refresh" class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800" title="Refresh">
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': chatStore.isLoadingMessages }" />
            </button>
            <button
              @click="showMembers = !showMembers"
              class="p-2 rounded-lg hover:bg-slate-800 lg:hidden"
              :class="showMembers ? 'text-purple-400' : 'text-slate-400'"
              title="Members"
            >
              <Users class="w-4 h-4" />
            </button>
          </header>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
            <div v-if="chatStore.isLoadingMessages && chatStore.messages.length === 0" class="flex justify-center py-8">
              <RefreshCw class="w-6 h-6 text-purple-400 animate-spin" />
            </div>
            <div v-else-if="chatStore.messages.length === 0" class="text-center text-xs text-slate-500 py-8">
              No messages recorded yet. Incoming group messages appear here once members chat.
            </div>

            <div
              v-for="msg in chatStore.messages"
              :key="msg.id"
              class="flex gap-2.5 group/msg items-start"
              :class="msg.direction === 'out' ? 'flex-row-reverse' : ''"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" :class="avatarColor(msg.fromId)">
                {{ initials(msg.fromName) }}
              </div>
              <div
                class="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm"
                :class="msg.direction === 'out'
                  ? 'bg-purple-600 text-white rounded-tr-sm'
                  : 'bg-slate-800/80 text-slate-100 rounded-tl-sm'"
              >
                <p
                  v-if="msg.direction === 'in'"
                  class="text-[11px] font-semibold mb-0.5"
                  :class="msg.isBot ? 'text-cyan-400' : 'text-purple-300'"
                >
                  {{ msg.fromName }}<span v-if="msg.isBot"> 🤖</span>
                </p>
                <!-- Reply context -->
                <div
                  v-if="msg.replyToMessageId"
                  class="mb-1 pl-2 border-l-2 rounded-sm text-[11px] leading-tight"
                  :class="msg.direction === 'out' ? 'border-white/50' : 'border-purple-400/60'"
                >
                  <span class="font-semibold opacity-90">{{ msg.replyToName || 'Reply' }}</span>
                  <span class="block opacity-60 truncate max-w-[200px]">{{ msg.replyToText }}</span>
                </div>
                <p class="whitespace-pre-wrap break-words">{{ msg.text }}</p>
                <p class="text-[9px] mt-1 opacity-60 text-right">{{ formatTime(msg.date) }}</p>
              </div>
              <!-- Reply action -->
              <button
                @click="startReply(msg)"
                class="self-center p-1.5 text-slate-500 hover:text-purple-300 rounded-lg hover:bg-slate-800 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                title="Reply"
              >
                <Reply class="w-3.5 h-3.5" />
              </button>
            </div>
            <div ref="messagesEnd"></div>
          </div>

          <!-- Reply preview -->
          <div v-if="replyingTo" class="px-3 pt-2 border-t border-slate-800/80">
            <div class="flex items-center gap-2 bg-slate-950/50 border-l-2 border-purple-500 rounded-lg px-3 py-2">
              <Reply class="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold text-purple-300 truncate">Replying to {{ replyingTo.name }}</p>
                <p class="text-[11px] text-slate-400 truncate">{{ replyingTo.text }}</p>
              </div>
              <button @click="cancelReply" class="p-1 text-slate-500 hover:text-white flex-shrink-0" title="Cancel reply">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Composer -->
          <form @submit.prevent="handleSend" class="p-3 flex items-end gap-2" :class="replyingTo ? 'pt-2' : 'border-t border-slate-800/80'">
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Type a message..."
              @keydown.enter.exact.prevent="handleSend"
              class="flex-1 resize-none bg-slate-950/60 border border-slate-800 focus:border-purple-500 text-white placeholder-slate-500 rounded-xl py-2.5 px-3.5 text-sm focus:outline-none max-h-32"
            ></textarea>
            <button
              type="submit"
              :disabled="!draft.trim() || chatStore.isSending"
              class="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-lg shadow-purple-500/15 transition-all flex-shrink-0"
            >
              <RefreshCw v-if="chatStore.isSending" class="w-5 h-5 animate-spin" />
              <Send v-else class="w-5 h-5" />
            </button>
          </form>
        </template>
      </section>

      <!-- Members panel -->
      <aside
        v-if="activeGroup"
        class="lg:col-span-3 border-l border-slate-800/80 flex-col min-h-0"
        :class="showMembers ? 'flex' : 'hidden lg:flex'"
      >
        <div class="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <Users class="w-4 h-4 text-purple-400" /> Members
          </h3>
          <span class="text-[10px] text-slate-500">
            {{ chatStore.members.length }}<span v-if="chatStore.totalCount !== null"> / {{ chatStore.totalCount }}</span>
          </span>
        </div>

        <div v-if="chatStore.adminError" class="mx-3 mt-3 text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Live admin lookup failed: {{ chatStore.adminError }}
        </div>

        <p class="px-4 pt-3 text-[10px] text-slate-500 leading-relaxed">
          Telegram bots can't list every member. Shown: admins + everyone the bot has seen chat here.
        </p>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="chatStore.isLoadingMembers && chatStore.members.length === 0" class="flex justify-center py-6">
            <RefreshCw class="w-5 h-5 text-purple-400 animate-spin" />
          </div>
          <div v-else-if="chatStore.members.length === 0" class="text-center text-xs text-slate-500 py-6 px-3">
            No members discovered yet.
          </div>

          <div
            v-for="m in chatStore.members"
            :key="m.userId"
            class="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-800/30"
          >
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 relative" :class="avatarColor(m.userId)">
              {{ initials(memberDisplayName(m)) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white truncate flex items-center gap-1">
                {{ memberDisplayName(m) }}
                <Crown v-if="m.status === 'creator'" class="w-3 h-3 text-amber-400 flex-shrink-0" title="Owner" />
                <Shield v-else-if="m.status === 'administrator'" class="w-3 h-3 text-cyan-400 flex-shrink-0" title="Admin" />
                <Bot v-if="m.isBot" class="w-3 h-3 text-slate-400 flex-shrink-0" title="Bot" />
              </p>
              <p class="text-[10px] text-slate-500 truncate">
                <span v-if="m.username">@{{ m.username }} · </span>{{ m.messageCount }} msg
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
