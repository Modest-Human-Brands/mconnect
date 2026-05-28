import { defineWebSocketHandler } from 'nitro/h3'
import { render } from '@vue-email/render'
import { templateRegistry } from '~/server/utils/template-registry-email'

import '~/templates/text/email'

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[Email Studio]: 🟢 Render Socket Connected (${peer.id})`)
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

      const html = await render(templateDef.component, transformedProps, {
        pretty: false,
      })

      peer.send(JSON.stringify({ html }))
    } catch (error: any) {
      console.error('❌ [Email Studio Render Error]:', error)
      peer.send(JSON.stringify({ error: 'Server rendering failed. Check terminal for details.' }))
    }
  },
  close(peer) {
    console.log(`[Email Studio]: 🔴 Render Socket Disconnected (${peer.id})`)
  },
})
