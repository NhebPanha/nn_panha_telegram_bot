// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Enable Nuxt 4 directory structure and features
  future: {
    compatibilityVersion: 4
  },

  // Modules
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  // Server-side configs (runtimeConfig)
  runtimeConfig: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
  },

  // Pinia setup
  pinia: {
    storesDirs: ['./app/stores/**']
  }
})
