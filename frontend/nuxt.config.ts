export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:4000',
      baseDomain: process.env.BASE_DOMAIN || 'localhost:3000'
    }
  },
  nitro: {
    routeRules: {
      '/api/**': { proxy: `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/**` }
    }
  },
  app: {
    head: {
      title: 'SobatWeb — School Website Builder',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Platform pembuatan website company profile sekolah modern dan mudah tanpa coding.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap' }
      ]
    }
  }
});
