import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { PageDefinition } from '@vui/core'
import type { ComponentRegistry } from '../component-registry/types'
import { renderPage } from './render-node'
import type { RenderContext } from './render-node'

export const VirtualUIRuntime = defineComponent({
  name: 'VirtualUIRuntime',
  props: {
    page: {
      type: Object as PropType<PageDefinition>,
      required: true,
    },
    registry: {
      type: Object as PropType<Pick<ComponentRegistry, 'get'>>,
      required: true,
    },
    revision: {
      type: Number,
      default: undefined,
    },
    interactive: {
      type: Boolean,
      default: false,
    },
    resolveHandler: {
      type: Function as PropType<RenderContext['resolveHandler']>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      // Reading revision keeps shallow-ref consumers re-rendering on commit.
      void props.revision
      return renderPage(props.page, {
        registry: props.registry,
        interactive: props.interactive,
        resolveHandler: props.resolveHandler,
      })
    }
  },
})
