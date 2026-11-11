import { createApp, h } from 'vue'
import { createBasicRegistry, VirtualUIRuntime } from '@vui/runtime-vue'
import type { UIDocument } from '@vui/core'
import loginDocument from '../../../fixtures/login.page.json'

const document = loginDocument as unknown as UIDocument
const registry = createBasicRegistry()

createApp({
  render: () =>
    h(
      'main',
      {
        style: {
          fontFamily: 'system-ui, sans-serif',
          margin: '0',
          padding: '0',
        },
      },
      [
        h(VirtualUIRuntime, {
          page: document.pages[0],
          registry,
        }),
      ],
    ),
}).mount('#app')
