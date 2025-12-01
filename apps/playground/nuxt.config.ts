export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit'],
  devtools: { enabled: true },
  mcp: {
    name: 'Playground MCP',
    evalite: {
      // Configure model in your eval files or via env vars
      // mcpUrl: 'http://localhost:3000/mcp', // optional, auto-detected
      // port: 5173, // optional, evalite UI port
    },
  },
})
