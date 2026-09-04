import { defineWebSocketHandler } from 'nitro/h3'
import { templateRegistry } from '#server/utils/template-registry-sms.ts'

import '#templates/text/sms/index.ts'

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[SMS Studio]: 🟢 Render Socket Connected (${peer.id})`)
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

      peer.send(
        JSON.stringify({
          text: transformedProps.text,
          metadata: transformedProps.metadata,
        })
      )
    } catch (error: any) {
      console.error('❌ [SMS Studio Render Error]:', error)
      peer.send(JSON.stringify({ error: 'Server rendering failed. Check terminal for details.' }))
    }
  },

  close(peer) {
    console.log(`[SMS Studio]: 🔴 Render Socket Disconnected (${peer.id})`)
  },
})
