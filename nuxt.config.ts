// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Apply the saved theme before first paint to avoid a flash of dark mode
  app: {
    head: {
      script: [
        {
          innerHTML:
            "try{if(localStorage.getItem('teleflow-theme')==='light')document.documentElement.classList.add('theme-light')}catch(e){}",
          tagPosition: 'head'
        }
      ]
    }
  },

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

  // Use our stylesheet (Tailwind directives + theme overrides) as the entry
  tailwindcss: {
    cssPath: '~/assets/css/main.css'
  },

  // Server-side configs (runtimeConfig)
  runtimeConfig: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
  },

  // Pinia setup
  pinia: {
    storesDirs: ['./app/stores/**']
  }
})
