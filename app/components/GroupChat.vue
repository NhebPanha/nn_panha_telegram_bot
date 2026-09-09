<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useGroupsStore } from '../stores/groups'
import { useChatStore, type ReplyTarget, type ChatMessage } from '../stores/chat'
import { useToast } from '../composables/useToast'
import { Send, Users, RefreshCw, Search, Crown, Shield, Bot, MessageSquare, ArrowLeft, Reply, X, Trash2, File, Download, Sticker, Image, Video } from 'lucide-vue-next'

const groupsStore = useGroupsStore()
const chatStore = useChatStore()
const toast = useToast()

const activeGroupId = ref<string | null>(null)
const draft = ref('')
const searchQuery = ref('')
const showMembers = ref(true)
const replyingTo = ref<ReplyTarget | null>(null)
const showStickerPicker = ref(false)
const messagesEnd = ref<HTMLElement | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)
const videoInput = ref<HTMLInputElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const activeGroup = computed(() => groupsStore.groups.find(g => g.id === activeGroupId.value) || null)
const stickers = computed(() => {
  const seen = new Set<string>()
  return chatStore.messages.filter((msg) => {
    if (msg.mediaType !== 'sticker' || !msg.mediaFileId || seen.has(msg.mediaFileId)) return false
    seen.add(msg.mediaFileId)
    return true
  })
})

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
  showStickerPicker.value = false
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

const handleClearChat = async () => {
  if (!activeGroupId.value || !activeGroup.value) return
  if (!confirm(`Clear the chat history for "${activeGroup.value.name}"?\n\nThis removes the stored conversation from the dashboard. It cannot be undone. (Messages already delivered in Telegram are not affected.)`)) return
  try {
    const res = await chatStore.clearChat(activeGroupId.value)
    replyingTo.value = null
    toast.success(`Chat cleared (${res.removed} messages removed)`)
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to clear chat')
  }
}

const handleDelete = async (msg: ChatMessage) => {
  if (!msg.messageId || !activeGroupId.value) return
  if (!confirm('Delete this message from the group? This cannot be undone.')) return
  try {
    await chatStore.deleteMessage(activeGroupId.value, msg.messageId)
    if (replyingTo.value?.messageId === msg.messageId) replyingTo.value = null
    toast.success('Message deleted')
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to delete message')
  }
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

const handleSendSticker = async (sticker: ChatMessage) => {
  if (!activeGroupId.value || !sticker.mediaFileId) return
  const groupId = activeGroupId.value
  const replyTo = replyingTo.value
  showStickerPicker.value = false
  replyingTo.value = null
  try {
    await chatStore.sendSticker(groupId, sticker, replyTo)
    await scrollToBottom()
  } catch (error: any) {
    replyingTo.value = replyTo
    toast.error(error.statusMessage || 'Failed to send sticker')
  }
}

const handleMediaSelect = async (event: Event, mediaType: 'photo' | 'video') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !activeGroupId.value) return

  if (!file.type.startsWith(`${mediaType === 'photo' ? 'image' : 'video'}/`)) {
    toast.error(`Please choose a ${mediaType === 'photo' ? 'image' : 'video'} file`)
    return
  }
  const maxSize = (mediaType === 'photo' ? 10 : 50) * 1024 * 1024
  if (file.size > maxSize) {
    toast.error(`${mediaType === 'photo' ? 'Images' : 'Videos'} must be ${mediaType === 'photo' ? '10' : '50'} MB or smaller`)
    return
  }

  const groupId = activeGroupId.value
  const caption = draft.value.trim()
  const replyTo = replyingTo.value
  try {
    await chatStore.sendMedia(groupId, file, mediaType, caption, replyTo)
    draft.value = ''
    replyingTo.value = null
    await scrollToBottom()
  } catch (error: any) {
    toast.error(error.statusMessage || `Failed to send ${mediaType}`)
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

// Serve Telegram attachments through the authenticated media proxy.
const mediaSrc = (fileId?: string) => (fileId ? `/api/media/${fileId}` : '')

const formatSeen = (iso: string) => new Date(iso).toLocaleString()

watch(() => chatStore.messages.length, scrollToBottom)

onMounted(async () => {
  if (groupsStore.groups.length === 0) await groupsStore.fetchGroups()
  // Auto-refresh the open conversation every 2s for live real-time sync
  pollTimer = setInterval(refresh, 2000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="liquid-glass rounded-2xl overflow-hidden relative">
    <div class="grid grid-cols-1 lg:grid-cols-12 h-[640px]">
      <!-- Sidebar: chat list -->
      <aside
        class="lg:col-span-3 border-r border-white/10 flex flex-col min-h-0"
        :class="activeGroupId ? 'hidden lg:flex' : 'flex'"
      >
        <div class="p-4 border-b border-white/10">
          <h3 class="text-sm font-bold text-white mb-3">Chats</h3>
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search chats..."
              class="w-full liquid-glass-input rounded-xl py-2 px-9 text-xs"
            />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-if="chatList.length === 0" class="p-6 text-center text-xs text-slate-400">
            No chats yet. Add groups in the Groups tab, or the bot will auto-discover them when added to a chat.
          </div>
          <button
            v-for="g in chatList"
            :key="g.id"
            @click="loadChat(g.id)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-white/5 transition-all cursor-pointer"
            :class="activeGroupId === g.id ? 'bg-purple-600/15 border-l-2 border-purple-500' : 'hover:bg-white/5'"
          >
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm" :class="avatarColor(Number(g.chatId))">
              {{ initials(g.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white truncate">{{ g.name }}</p>
              <p class="text-[10px] text-slate-400 font-mono truncate">{{ g.chatId }} · {{ g.type }}</p>
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
          <div class="p-4 bg-white/5 rounded-full border border-white/10 text-slate-400 mb-4 backdrop-blur-md">
            <MessageSquare class="w-8 h-8" />
          </div>
          <h4 class="text-base font-bold text-slate-200">Select a chat</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-xs">
            Pick a group to view its conversation and members, and send messages like Telegram.
          </p>
        </div>

        <template v-else>
          <!-- Conversation header -->
          <header class="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <button @click="activeGroupId = null" class="lg:hidden p-1.5 text-slate-400 hover:text-white cursor-pointer">
              <ArrowLeft class="w-4 h-4" />
            </button>
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" :class="avatarColor(Number(activeGroup.chatId))">
              {{ initials(activeGroup.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-white truncate">{{ activeGroup.name }}</p>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shadow-sm">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p class="text-[10px] text-slate-400">
                {{ chatStore.totalCount !== null ? chatStore.totalCount + ' members' : chatStore.members.length + ' known' }}
              </p>
            </div>
            <button @click="refresh" class="p-2 text-slate-400 hover:text-white rounded-xl liquid-glass-pill cursor-pointer" title="Refresh">
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': chatStore.isLoadingMessages }" />
            </button>
            <button
              @click="handleClearChat"
              :disabled="chatStore.messages.length === 0"
              class="p-2 text-slate-400 hover:text-rose-400 rounded-xl liquid-glass-pill hover:border-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Clear chat history"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              @click="showMembers = !showMembers"
              class="p-2 rounded-xl liquid-glass-pill lg:hidden cursor-pointer"
              :class="showMembers ? 'text-purple-400 border-purple-500/30' : 'text-slate-400'"
              title="Members"
            >
              <Users class="w-4 h-4" />
            </button>
          </header>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-4 space-y-2.5 chat-canvas">
            <div v-if="chatStore.isLoadingMessages && chatStore.messages.length === 0" class="flex justify-center py-8">
              <RefreshCw class="w-6 h-6 text-purple-400 animate-spin" />
            </div>
            <div v-else-if="chatStore.messages.length === 0" class="text-center text-xs text-slate-400 py-8">
              No messages recorded yet. Incoming group messages appear here once members chat.
            </div>

            <div
              v-for="msg in chatStore.messages"
              :key="msg.id"
              class="flex gap-2.5 group/msg items-start"
              :class="msg.direction === 'out' ? 'flex-row-reverse' : ''"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-sm" :class="avatarColor(msg.fromId)">
                {{ initials(msg.fromName) }}
              </div>
              <div
                class="max-w-[78%] text-sm"
                :class="msg.mediaType === 'sticker'
                  ? 'bg-transparent'
                  : (msg.direction === 'out'
                      ? 'chat-bubble-out rounded-2xl rounded-tr-md px-3.5 py-2'
                      : 'chat-bubble-in rounded-2xl rounded-tl-md px-3.5 py-2')"
              >
                <p
                  v-if="msg.direction === 'in'"
                  class="text-[11px] font-bold mb-0.5"
                  :class="msg.isBot ? 'text-cyan-400' : 'text-purple-400'"
                >
                  {{ msg.fromName }}<span v-if="msg.isBot"> 🤖</span>
                </p>

                <!-- Reply context -->
                <div
                  v-if="msg.replyToMessageId"
                  class="mb-1.5 pl-2 py-0.5 border-l-2 rounded-sm text-[11px] leading-tight"
                  :class="msg.direction === 'out' ? 'border-white/50' : 'border-purple-400/60'"
                >
                  <span class="font-semibold opacity-90">{{ msg.replyToName || 'Reply' }}</span>
                  <span class="block opacity-60 truncate max-w-[220px]">{{ msg.replyToText }}</span>
                </div>

                <!-- Media attachment -->
                <div v-if="msg.mediaType" :class="msg.text ? 'mb-1.5' : ''">
                  <!-- Photo -->
                  <a v-if="msg.mediaType === 'photo'" :href="mediaSrc(msg.mediaFileId)" target="_blank" rel="noopener">
                    <img :src="mediaSrc(msg.mediaFileId)" loading="lazy" class="rounded-xl max-h-72 w-auto object-cover cursor-zoom-in ring-1 ring-white/10" />
                  </a>
                  <!-- Static sticker (webp) -->
                  <img
                    v-else-if="msg.mediaType === 'sticker' && msg.stickerFormat === 'static'"
                    :src="mediaSrc(msg.mediaFileId)" loading="lazy"
                    class="w-32 h-32 object-contain drop-shadow"
                  />
                  <!-- Video sticker (webm) -->
                  <video
                    v-else-if="msg.mediaType === 'sticker' && msg.stickerFormat === 'video'"
                    :src="mediaSrc(msg.mediaFileId)" autoplay loop muted playsinline
                    class="w-32 h-32 object-contain drop-shadow"
                  ></video>
                  <!-- Animated sticker (.tgs / Lottie) -->
                  <div v-else-if="msg.mediaType === 'sticker'" class="w-24 h-24 flex items-center justify-center text-6xl">
                    {{ msg.mediaEmoji || '🎯' }}
                  </div>
                  <!-- Video -->
                  <video
                    v-else-if="msg.mediaType === 'video'"
                    :src="mediaSrc(msg.mediaFileId)" controls preload="metadata"
                    class="rounded-xl max-h-72 max-w-full ring-1 ring-white/10"
                  ></video>
                  <!-- Animation / GIF -->
                  <video
                    v-else-if="msg.mediaType === 'animation'"
                    :src="mediaSrc(msg.mediaFileId)" autoplay loop muted playsinline
                    class="rounded-xl max-h-72 max-w-full ring-1 ring-white/10"
                  ></video>
                  <!-- Voice / Audio -->
                  <audio
                    v-else-if="msg.mediaType === 'voice' || msg.mediaType === 'audio'"
                    :src="mediaSrc(msg.mediaFileId)" controls
                    class="max-w-[240px] h-9"
                  ></audio>
                  <!-- Document / File -->
                  <a
                    v-else-if="msg.mediaType === 'document'"
                    :href="mediaSrc(msg.mediaFileId)" target="_blank" rel="noopener"
                    class="flex items-center gap-2.5 rounded-lg px-3 py-2 max-w-[240px] transition-colors"
                    :class="msg.direction === 'out' ? 'bg-white/15 hover:bg-white/25' : 'bg-black/20 hover:bg-black/30'"
                  >
                    <File class="w-5 h-5 flex-shrink-0 opacity-80" />
                    <span class="truncate flex-1 text-xs font-medium">{{ msg.mediaFileName || 'Document' }}</span>
                    <Download class="w-4 h-4 flex-shrink-0 opacity-70" />
                  </a>
                </div>

                <p v-if="msg.text" class="whitespace-pre-wrap break-words">{{ msg.text }}</p>
                <p
                  class="text-[9px] mt-1 opacity-60 text-right"
                  :class="msg.mediaType === 'sticker' ? 'text-slate-400' : ''"
                >
                  {{ formatTime(msg.date) }}
                </p>
              </div>
              <!-- Message actions -->
              <div class="self-center flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                <button
                  @click="startReply(msg)"
                  class="p-1.5 text-slate-400 hover:text-purple-300 rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Reply"
                >
                  <Reply class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="msg.messageId"
                  @click="handleDelete(msg)"
                  class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/15 cursor-pointer"
                  title="Delete message"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div ref="messagesEnd"></div>
          </div>

          <!-- Reply preview -->
          <div v-if="replyingTo" class="px-3 pt-2 border-t border-white/10">
            <div class="flex items-center gap-2 liquid-glass-subtle border-l-2 border-purple-500 rounded-xl px-3 py-2">
              <Reply class="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold text-purple-300 truncate">Replying to {{ replyingTo.name }}</p>
                <p class="text-[11px] text-slate-400 truncate">{{ replyingTo.text }}</p>
              </div>
              <button @click="cancelReply" class="p-1 text-slate-400 hover:text-white flex-shrink-0 cursor-pointer" title="Cancel reply">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Sticker picker -->
          <div v-if="showStickerPicker" class="border-t border-white/10 liquid-glass-subtle px-3 py-2">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[11px] font-semibold text-slate-200">Recent stickers</p>
              <button type="button" @click="showStickerPicker = false" class="p-1 text-slate-400 hover:text-white cursor-pointer" title="Close sticker picker">
                <X class="w-4 h-4" />
              </button>
            </div>
            <div v-if="stickers.length" class="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto">
              <button
                v-for="sticker in stickers"
                :key="sticker.mediaFileId"
                type="button"
                :disabled="chatStore.isSending"
                @click="handleSendSticker(sticker)"
                class="h-14 rounded-lg hover:bg-white/10 disabled:opacity-40 flex items-center justify-center overflow-hidden cursor-pointer"
                :title="`Send ${sticker.mediaEmoji || 'sticker'}`"
              >
                <img
                  v-if="sticker.stickerFormat === 'static'"
                  :src="mediaSrc(sticker.mediaFileId)"
                  :alt="sticker.mediaEmoji || 'Sticker'"
                  class="w-12 h-12 object-contain"
                />
                <video
                  v-else-if="sticker.stickerFormat === 'video'"
                  :src="mediaSrc(sticker.mediaFileId)"
                  autoplay loop muted playsinline
                  class="w-12 h-12 object-contain"
                ></video>
                <span v-else class="text-3xl">{{ sticker.mediaEmoji || 'Sticker' }}</span>
              </button>
            </div>
            <p v-else class="text-[11px] text-slate-400">Stickers sent in this chat will appear here.</p>
          </div>

          <!-- Composer -->
          <form @submit.prevent="handleSend" class="p-3 flex items-end gap-2" :class="replyingTo ? 'pt-2' : 'border-t border-white/10'">
            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="handleMediaSelect($event, 'photo')" />
            <input ref="videoInput" type="file" accept="video/*" class="hidden" @change="handleMediaSelect($event, 'video')" />
            <button
              type="button"
              :disabled="chatStore.isSending"
              @click="photoInput?.click()"
              class="p-2.5 rounded-xl text-slate-400 hover:text-white liquid-glass-pill disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer"
              title="Send image"
            >
              <Image class="w-5 h-5" />
            </button>
            <button
              type="button"
              :disabled="chatStore.isSending"
              @click="videoInput?.click()"
              class="p-2.5 rounded-xl text-slate-400 hover:text-white liquid-glass-pill disabled:opacity-40 transition-all flex-shrink-0 cursor-pointer"
              title="Send video"
            >
              <Video class="w-5 h-5" />
            </button>
            <button
              type="button"
              @click="showStickerPicker = !showStickerPicker"
              :class="showStickerPicker ? 'text-purple-300 border-purple-500/40 bg-purple-500/20' : 'text-slate-400 hover:text-white'"
              class="p-2.5 rounded-xl liquid-glass-pill transition-all flex-shrink-0 cursor-pointer"
              title="Choose a sticker"
            >
              <Sticker class="w-5 h-5" />
            </button>
            <textarea
              v-model="draft"
              rows="1"
              placeholder="Type a message..."
              @keydown.enter.exact.prevent="handleSend"
              class="flex-1 resize-none liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm max-h-32"
            ></textarea>
            <button
              type="submit"
              :disabled="!draft.trim() || chatStore.isSending"
              class="liquid-glass-button disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all flex-shrink-0 cursor-pointer"
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
        class="lg:col-span-3 border-l border-white/10 flex-col min-h-0"
        :class="showMembers ? 'flex' : 'hidden lg:flex'"
      >
        <div class="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <Users class="w-4 h-4 text-purple-400" /> Members
          </h3>
          <span class="text-[10px] text-slate-400">
            {{ chatStore.members.length }}<span v-if="chatStore.totalCount !== null"> / {{ chatStore.totalCount }}</span>
          </span>
        </div>

        <div v-if="chatStore.adminError" class="mx-3 mt-3 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl px-2.5 py-1.5 backdrop-blur-md">
          Live admin lookup failed: {{ chatStore.adminError }}
        </div>

        <p class="px-4 pt-3 text-[10px] text-slate-400 leading-relaxed">
          Telegram bots can't list every member. Shown: admins + everyone the bot has seen chat here.
        </p>

        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="chatStore.isLoadingMembers && chatStore.members.length === 0" class="flex justify-center py-6">
            <RefreshCw class="w-5 h-5 text-purple-400 animate-spin" />
          </div>
          <div v-else-if="chatStore.members.length === 0" class="text-center text-xs text-slate-400 py-6 px-3">
            No members discovered yet.
          </div>

          <div
            v-for="m in chatStore.members"
            :key="m.userId"
            class="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-all"
          >
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 relative shadow-sm" :class="avatarColor(m.userId)">
              {{ initials(memberDisplayName(m)) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold text-white truncate flex items-center gap-1">
                {{ memberDisplayName(m) }}
                <Crown v-if="m.status === 'creator'" class="w-3 h-3 text-amber-400 flex-shrink-0" title="Owner" />
                <Shield v-else-if="m.status === 'administrator'" class="w-3 h-3 text-cyan-400 flex-shrink-0" title="Admin" />
                <Bot v-if="m.isBot" class="w-3 h-3 text-slate-400 flex-shrink-0" title="Bot" />
              </p>
              <p class="text-[10px] text-slate-400 truncate">
                <span v-if="m.username">@{{ m.username }} · </span>{{ m.messageCount }} msg
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
