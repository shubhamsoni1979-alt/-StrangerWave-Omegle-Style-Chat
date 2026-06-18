export default defineNuxtConfig({
  compatibilityDate: "2024-08-01",

  modules: ["@nuxt/ui", "@pinia/nuxt"],

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  ssr: true,

  app: {
    head: {
      title: "StrangerWave - Talk to someone new",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Instant random video chat with people around the world. No signup required.",
        },
      ],
    },
  },

  colorMode: {
    preference: "dark",
    fallback: "dark",
    classSuffix: "",
  },

  runtimeConfig: {
    public: {
      // Where the Socket.io / signaling server lives. Override via
      // NUXT_PUBLIC_SOCKET_URL or NUXT_PUBLIC_BACKEND_URL in production.
      backendUrl: process.env.NUXT_PUBLIC_SOCKET_URL ?? process.env.NUXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001",
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // run `npm run typecheck` separately/in CI instead of blocking dev server
  },

  devtools: { enabled: true },
});
