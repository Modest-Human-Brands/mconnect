import { defineWebSocketHandler } from 'nitro/h3'
import { templateRegistry } from '#server/utils/template-registry-whatsapp.ts'

import '#templates/text/whatsapp/index.ts'

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[WhatsApp Studio]: 🟢 Render Socket Connected (${peer.id})`)
  },

  async message(peer, message) {
    try {
      const payload = JSON.parse(message.text())
      const { templateId, variables } = payload

      const templateDef = templateRegistry[templateId]
      if (!templateDef) {
        peer.send(JSON.stringify({ error: `Template '${templateId}' not found.` }))
        return
      }

      const transformedProps = templateDef.transformPayload(variables || {})

      peer.send(JSON.stringify({ whatsappData: transformedProps }))
    } catch (error: any) {
      console.error('❌ [WhatsApp Studio Render Error]:', error)
      peer.send(JSON.stringify({ error: 'Server rendering failed. Check terminal for details.' }))
    }
  },

  close(peer) {
    console.log(`[WhatsApp Studio]: 🔴 Render Socket Disconnected (${peer.id})`)
  },
})
