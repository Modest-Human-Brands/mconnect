import { defineWebSocketHandler } from 'nitro/h3'
import { useStorage } from 'nitro/storage'

export default defineWebSocketHandler({
  async open(peer) {
    const url = new URL(peer.remoteAddress!, 'http://localhost')
    const userId = url.searchParams.get('userId')

    if (!userId) {
      console.warn('[Presence Engine]: Connection rejected. Missing userId.')
      peer.close()
      return
    }

    peer.subscribe(`agent:${userId}`)

    await useStorage('presence').setItem(`agent-${userId}`, {
      status: 'online',
      socketId: peer.id,
      connectedAt: Date.now(),
    })

    console.log(`[Presence Engine]: 🟢 Agent ${userId} is ONLINE (Socket: ${peer.id})`)
  },

  async message(peer, message) {
    console.log(`[Message from ${peer.id}]:`, message.text())
  },

  async close(peer) {
    const url = new URL(peer.remoteAddress!, 'http://localhost')
    const userId = url.searchParams.get('userId')

    if (userId) {
      await useStorage('presence').removeItem(`agent-${userId}`)
      console.log(`[Presence Engine]: 🔴 Agent ${userId} is OFFLINE`)
    }
  },

  error(peer, error) {
    console.error(`[Presence Engine Error]:`, error)
  },
})
