import { defineEventHandler, getValidatedRouterParams, HTTPError, setHeader } from 'nitro/h3'
import { templateRegistry } from '~/server/utils/template-registry-whatsapp'
import { z } from 'zod'

import '~/templates/text/whatsapp/QuotationV1'

const pathParamsSchema = z.object({ id: z.string() })

export default defineEventHandler(async (event) => {
  const { id: templateId } = await getValidatedRouterParams(event, pathParamsSchema)

  if (!templateId) {
    throw new HTTPError({ statusCode: 400, statusMessage: 'Missing templateId parameter.' })
  }

  const templateDef = templateRegistry[templateId]
  if (!templateDef) {
    throw new HTTPError({ statusCode: 404, statusMessage: `Template '${templateId}' not found.` })
  }

  const variables: Record<string, any> = {}

  function initMockData(shape: any, mockSource: any = {}): any {
    const obj: any = {}
    for (const [key, zodItem] of Object.entries(shape)) {
      let currentDef = zodItem as any
      while (currentDef?._def?.innerType) currentDef = currentDef._def.innerType

      const typeName = currentDef?._def?.typeName || ''
      if (typeName === 'ZodObject' && currentDef.shape) {
        obj[key] = initMockData(currentDef.shape, mockSource[key] || {})
      } else if (typeName === 'ZodArray') {
        obj[key] = mockSource[key] || []
      } else {
        obj[key] = mockSource[key] === undefined ? '' : mockSource[key]
      }
    }
    return obj
  }

  if (templateDef.schema?.shape) {
    Object.assign(variables, initMockData(templateDef.schema.shape, templateDef.placeholders || {}))
  }

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>mconnect | WhatsApp Studio - ${templateId}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
      .wa-body b { font-weight: 600; }
    </style>
  </head>
  <body class="bg-gray-100 overflow-hidden h-screen flex text-gray-800 font-sans">
    
    <div id="app" class="flex size-full">

      <div class="w-2/3 h-full flex flex-col border-r border-gray-300 bg-white">
        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semi-bold text-gray-700 flex justify-between items-center shadow-sm z-10">
           <span>Template: <span class="text-[#25D366]">${templateId}</span></span>
           <span class="flex items-center gap-2">
             <span class="w-2 h-2 rounded-full" :class="socketConnected ? 'bg-[#25D366]' : 'bg-red-500'"></span>
             <span class="text-xs tracking-wide" :class="socketConnected ? 'text-[#128C7E]' : 'text-red-700'">
                {{ socketConnected ? 'WABA Socket Active' : 'Disconnected' }}
             </span>
           </span>
        </div>
        
        <div class="flex-1 overflow-auto bg-[#efeae2] flex items-center justify-center p-8 relative" style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-blend-mode: multiply; opacity: 0.95;">
           
           <div v-if="isRendering" class="absolute top-4 right-4 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md animate-pulse z-50">
              Syncing...
           </div>

           <div class="relative mx-auto w-[350px] h-[700px] bg-black rounded-[40px] border-[14px] border-black shadow-2xl overflow-hidden flex flex-col">
              <div class="absolute top-0 inset-x-0 h-6 bg-black rounded-b-3xl w-40 mx-auto z-20"></div>
              
              <div class="bg-[#005e54] text-white pt-10 pb-3 px-4 flex items-center gap-3 z-10 shadow-md">
                <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold overflow-hidden">
                   <img src="https://modesthumanbrands.com/logo.svg" onerror="this.style.display='none'" />
                </div>
                <div>
                   <div class="text-[15px] font-semi-bold leading-tight">Business Account</div>
                   <div class="text-[11px] opacity-80">Official Business Account</div>
                </div>
              </div>
              
              <div class="flex-1 bg-transparent p-4 flex flex-col justify-end gap-2 overflow-y-auto pb-8">
                 <div class="text-center">
                   <span class="bg-[#E1F3FB] text-[#556269] text-[11px] px-3 py-1 rounded-lg shadow-sm">TODAY</span>
                 </div>
                 
                 <div v-if="whatsappData" class="bg-white rounded-lg rounded-tl-none w-[90%] self-start shadow-sm flex flex-col">
                    
                    <div class="p-2.5 pb-1">
                      <div v-if="whatsappData.header" class="text-[15px] font-bold text-gray-900 mb-1">
                        {{ whatsappData.header.content }}
                      </div>
                      
                      <div class="wa-body text-[15px] text-gray-800 whitespace-pre-wrap leading-snug" v-html="parsedBody"></div>
                      
                      <div v-if="whatsappData.footer" class="text-[12.5px] text-gray-500 mt-2 flex justify-between items-end">
                        <span>{{ whatsappData.footer }}</span>
                        <span class="text-[10.5px] text-gray-400 ml-2">12:00 PM</span>
                      </div>
                      <div v-else class="text-right text-[10.5px] text-gray-400 mt-1">12:00 PM</div>
                    </div>

                    <div v-if="whatsappData.buttons" class="flex flex-col border-t border-gray-200 mt-1">
                      <div v-for="(btn, idx) in whatsappData.buttons" :key="idx" class="py-2.5 text-center text-[#00a884] font-medium text-[15px] border-b border-gray-200 last:border-0 flex justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                        <svg v-if="btn.type === 'url'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                        {{ btn.text }}
                      </div>
                    </div>
                 </div>

              </div>
              
              <div class="absolute bottom-1 inset-x-0 h-1 bg-black rounded-full w-1/3 mx-auto z-20"></div>
           </div>

        </div>
      </div>

      <div class="w-1/3 h-full bg-white flex flex-col">
        <div class="p-4 bg-gray-50 border-b border-gray-200 font-semi-bold text-gray-700 shadow-sm z-10 flex justify-between items-center">
           <span>Live Variables Editor</span>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
           <editor-node
             v-for="(val, key) in variables"
             :key="key"
             :node-key="key"
             v-model="variables[key]"
           ></editor-node>
        </div>
      </div>

    </div>

    <template id="editor-node-template">
      <div class="flex flex-col">
        <label class="text-xs font-bold uppercase tracking-wider mb-2" :class="isObject ? 'text-[#25D366]' : 'text-gray-500'">
          {{ nodeKey }}
        </label>
        
        <div v-if="isObject" class="pl-4 border-l-2 border-[#25D366] opacity-80 ml-1 flex flex-col gap-4 mt-1 mb-2">
          <editor-node 
            v-for="(val, key) in modelValue" 
            :key="key" 
            :node-key="key"
            :model-value="val"
            @update:model-value="updateNested(key, $event)"
          ></editor-node>
        </div>
        
        <textarea
          v-else-if="isArray"
          class="border border-gray-300 rounded-md p-2.5 text-sm font-mono focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/30 outline-none transition-all h-24"
          :value="JSON.stringify(modelValue, null, 2)"
          @input="updateArray"
        ></textarea>
        
        <input
          v-else
          type="text"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          class="border border-gray-300 bg-gray-50 rounded-md p-2.5 text-sm focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/30 outline-none transition-all focus:bg-white"
          :placeholder="'Enter ' + nodeKey"
        />
      </div>
    </template>

    <script>
      const EditorNode = {
        name: 'EditorNode',
        template: '#editor-node-template',
        props: ['modelValue', 'nodeKey'],
        emits: ['update:modelValue'],
        computed: {
          isObject() { return this.modelValue !== null && typeof this.modelValue === 'object' && !Array.isArray(this.modelValue); },
          isArray() { return Array.isArray(this.modelValue); }
        },
        methods: {
          updateNested(key, val) { this.$emit('update:modelValue', { ...this.modelValue, [key]: val }); },
          updateArray(e) { try { this.$emit('update:modelValue', JSON.parse(e.target.value)); } catch(err) {} }
        }
      };

      const App = {
        data() {
          return {
            variables: ${JSON.stringify(variables)},
            whatsappData: null,
            error: null,
            ws: null,
            socketConnected: false,
            isRendering: false,
            renderTimeout: null
          }
        },
        computed: {
          parsedBody() {
            if (!this.whatsappData || !this.whatsappData.body) return '';
            // WhatsApp uses *asterisks* for bold text. We safely convert this to <b> tags for HTML preview.
            // Note: We escape HTML entities first to prevent XSS injection from variables!
            const escaped = this.whatsappData.body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return escaped.replace(/\\*([^*]+)\\*/g, '<b>$1</b>');
          }
        },
        mounted() {
          this.connectWebSocket();
        },
        methods: {
          connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.ws = new WebSocket(protocol + '//' + window.location.host + '/api/connect/text/whatsapp/template/preview');
            
            this.ws.onopen = () => {
              this.socketConnected = true;
              this.triggerRender();
            };
            
            this.ws.onclose = () => {
              this.socketConnected = false;
              setTimeout(() => this.connectWebSocket(), 3000); 
            };

            this.ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              this.isRendering = false;
              if (data.whatsappData) {
                this.whatsappData = data.whatsappData;
                this.error = null;
              } else if (data.error) {
                console.error(data.error);
                this.error = data.error;
              }
            };
          },
          triggerRender() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.isRendering = true;
              this.ws.send(JSON.stringify({
                templateId: '${templateId}',
                variables: this.variables
              }));
            }
          }
        },
        watch: {
          variables: {
            deep: true,
            handler() {
              clearTimeout(this.renderTimeout);
              this.renderTimeout = setTimeout(() => {
                this.triggerRender();
              }, 150);
            }
          }
        }
      };

      const vueApp = Vue.createApp(App);
      vueApp.component('editor-node', EditorNode); 
      vueApp.mount('#app');
    </script>
  </body>
  </html>
  `

  event.res.headers.set('content-type', 'text/html')
  return html
})
