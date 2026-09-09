<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAiStore } from '../stores/ai'
import { useToast } from '../composables/useToast'
import { Sparkles, AlertCircle, RefreshCw, Bot } from 'lucide-vue-next'

const aiStore = useAiStore()
const toast = useToast()

const form = ref({
  enabled: false,
  replyOnMention: true,
  model: 'gemini-flash-latest',
  systemPrompt: '',
  maxTokens: 600
})
const saving = ref(false)

const models = [
  { value: 'gemini-flash-latest', label: 'Gemini Flash', hint: 'Fast & capable · recommended' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', hint: 'Fastest & cheapest' },
  { value: 'gemini-pro-latest', label: 'Gemini Pro', hint: 'Most capable · slower' }
]

const syncForm = () => {
  const s = aiStore.settings
  form.value = {
    enabled: s.enabled,
    replyOnMention: s.replyOnMention,
    model: s.model || 'claude-opus-5',
    systemPrompt: s.systemPrompt || '',
    maxTokens: s.maxTokens || 600
  }
}

onMounted(async () => {
  await aiStore.fetchSettings()
  syncForm()
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await aiStore.updateSettings({ ...form.value })
    if (res.success) {
      syncForm()
      toast.success('AI settings saved')
    }
  } catch (error: any) {
    toast.error(error.statusMessage || 'Failed to save AI settings')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="liquid-glass rounded-2xl p-6 space-y-6 relative overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <div class="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400 shadow-sm shadow-purple-500/20 backdrop-blur-md">
        <Sparkles class="w-5 h-5" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-white">AI Auto-Reply</h3>
        <p class="text-xs text-slate-400">Let the bot answer with Google Gemini when a user mentions it or replies to it</p>
      </div>
    </div>

    <!-- API key warning -->
    <div
      v-if="!aiStore.settings.keyConfigured"
      class="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-3 backdrop-blur-md shadow-sm"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
      <div>
        <h5 class="text-sm font-bold text-amber-300">Gemini API key not set</h5>
        <p class="text-xs text-slate-300 mt-1">
          Set <span class="font-mono text-white">GEMINI_API_KEY</span> in your <span class="font-mono">.env</span>
          (or <span class="font-mono">NUXT_GEMINI_API_KEY</span> as a Wrangler secret on Cloudflare). AI replies stay off until it's configured.
        </p>
      </div>
    </div>

    <form @submit.prevent="handleSave" class="space-y-5">
      <!-- Enable toggle -->
      <div class="flex items-center justify-between liquid-glass-subtle rounded-xl px-4 py-3 border border-white/10">
        <div class="flex items-center gap-3">
          <Bot class="w-4 h-4 text-purple-400" />
          <div>
            <p class="text-sm font-semibold text-white">Enable AI auto-reply</p>
            <p class="text-[11px] text-slate-400">Master switch for AI-generated group replies</p>
          </div>
        </div>
        <button
          type="button"
          @click="form.enabled = !form.enabled"
          class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          :class="form.enabled ? 'bg-purple-600 shadow-sm shadow-purple-500/40' : 'bg-slate-850'"
        >
          <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition" :class="form.enabled ? 'translate-x-4' : 'translate-x-0'" />
        </button>
      </div>

      <!-- Reply on mention -->
      <div class="flex items-center justify-between liquid-glass-subtle rounded-xl px-4 py-3 border border-white/10">
        <div>
          <p class="text-sm font-semibold text-white">Reply when mentioned</p>
          <p class="text-[11px] text-slate-400">Trigger a reply on <span class="font-mono">@bot</span> mentions and replies to the bot</p>
        </div>
        <button
          type="button"
          @click="form.replyOnMention = !form.replyOnMention"
          class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
          :class="form.replyOnMention ? 'bg-purple-600 shadow-sm shadow-purple-500/40' : 'bg-slate-850'"
        >
          <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition" :class="form.replyOnMention ? 'translate-x-4' : 'translate-x-0'" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Model -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Model</label>
          <select
            v-model="form.model"
            class="w-full liquid-glass-input rounded-xl py-2.5 px-3 text-sm"
          >
            <option v-for="m in models" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <p class="text-[10px] text-slate-400 mt-1">{{ models.find(m => m.value === form.model)?.hint }}</p>
        </div>

        <!-- Max tokens -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Max reply length (tokens)</label>
          <input
            type="number"
            v-model.number="form.maxTokens"
            min="64"
            max="4096"
            class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm"
          />
          <p class="text-[10px] text-slate-400 mt-1">Shorter = faster & cheaper. ~600 suits chat.</p>
        </div>
      </div>

      <!-- System prompt -->
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">System Prompt (bot persona)</label>
        <textarea
          v-model="form.systemPrompt"
          rows="5"
          placeholder="You are a friendly assistant in a Telegram group..."
          class="w-full liquid-glass-input rounded-xl py-2.5 px-3.5 text-sm resize-none"
        ></textarea>
        <p class="text-[10px] text-slate-400 mt-1">Defines how the bot behaves and what language/tone it uses.</p>
      </div>

      <!-- Save -->
      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="liquid-glass-button disabled:opacity-50 text-white text-sm font-medium py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
          {{ saving ? 'Saving...' : 'Save Settings' }}
        </button>
      </div>
    </form>

    <!-- How it works -->
    <div class="text-[11px] text-slate-400 liquid-glass-subtle border border-white/10 rounded-xl p-4 leading-relaxed">
      <p class="font-semibold text-slate-200 mb-1">How it works</p>
      In a group, a user writes <span class="font-mono text-purple-300">@{{ 'yourbot' }} what's the weather?</span> (or replies to one of the bot's messages).
      The bot sends the question to Gemini and posts the answer back as a reply. Turn off <span class="font-mono">Group Privacy</span> in BotFather so the bot can see the messages.
    </div>
  </div>
</template>
