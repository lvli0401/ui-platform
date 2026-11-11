import { DOCUMENT_SCHEMA_VERSION, STYLE_KEY_SET, UINODE_TYPES } from './schema'
import type { UIDocument, UINode, UINodeType } from './types'

export interface ValidationIssue {
  code: string
  path: string
  message: string
  severity: 'error' | 'warning'
}

export type ParseResult =
  | { ok: true; document: UIDocument; warnings: ValidationIssue[] }
  | { ok: false; issues: ValidationIssue[] }

function issue(
  issues: ValidationIssue[],
  severity: ValidationIssue['severity'],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ severity, code, path, message })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isJsonValue(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  active: Set<object>,
): boolean {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) return true
    issue(issues, 'error', 'INVALID_JSON_VALUE', path, 'Number must be finite.')
    return false
  }

  if (Array.isArray(value)) {
    if (active.has(value)) {
      issue(issues, 'error', 'CIRCULAR_VALUE', path, 'Circular reference detected.')
      return false
    }
    active.add(value)
    let valid = true
    value.forEach((item, index) => {
      valid = isJsonValue(item, `${path}[${index}]`, issues, active) && valid
    })
    active.delete(value)
    return valid
  }

  if (isPlainObject(value)) {
    if (active.has(value)) {
      issue(issues, 'error', 'CIRCULAR_VALUE', path, 'Circular reference detected.')
      return false
    }
    active.add(value)
    let valid = true
    for (const [key, item] of Object.entries(value)) {
      valid = isJsonValue(item, `${path}.${key}`, issues, active) && valid
    }
    active.delete(value)
    return valid
  }

  issue(
    issues,
    'error',
    'INVALID_JSON_VALUE',
    path,
    `Value of type "${typeof value}" is not JSON serializable.`,
  )
  return false
}

function validateNode(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  seenIds: Set<string>,
  activeNodes: Set<object>,
): void {
  if (!isPlainObject(value)) {
    issue(issues, 'error', 'NODE_INVALID', path, 'Node must be an object.')
    return
  }

  if (activeNodes.has(value)) {
    issue(issues, 'error', 'CIRCULAR_NODE', path, 'Node tree contains a cycle.')
    return
  }
  activeNodes.add(value)

  if (typeof value.id !== 'string' || value.id.length === 0) {
    issue(issues, 'error', 'NODE_ID_MISSING', `${path}.id`, 'Node id must be a non-empty string.')
  } else if (seenIds.has(value.id)) {
    issue(issues, 'error', 'NODE_ID_DUPLICATE', `${path}.id`, `Duplicate node id "${value.id}".`)
  } else {
    seenIds.add(value.id)
  }

  const type = value.type
  if (typeof type !== 'string' || !UINODE_TYPES.includes(type as UINodeType)) {
    issue(
      issues,
      'error',
      'NODE_TYPE_INVALID',
      `${path}.type`,
      `Node type must be one of: ${UINODE_TYPES.join(', ')}.`,
    )
  } else {
    if (type === 'element' && (typeof value.tag !== 'string' || value.tag.length === 0)) {
      issue(issues, 'error', 'ELEMENT_TAG_MISSING', `${path}.tag`, 'Element node requires a non-empty tag.')
    }
    if (type === 'component' && (typeof value.component !== 'string' || value.component.length === 0)) {
      issue(
        issues,
        'error',
        'COMPONENT_NAME_MISSING',
        `${path}.component`,
        'Component node requires a non-empty component name.',
      )
    }
    if (type === 'fragment') {
      if (value.tag !== undefined) {
        issue(issues, 'error', 'FRAGMENT_TAG_FORBIDDEN', `${path}.tag`, 'Fragment node must not have a tag.')
      }
      if (value.component !== undefined) {
        issue(
          issues,
          'error',
          'FRAGMENT_COMPONENT_FORBIDDEN',
          `${path}.component`,
          'Fragment node must not have a component.',
        )
      }
    }
  }

  if (value.key !== undefined && typeof value.key !== 'string') {
    issue(issues, 'error', 'NODE_KEY_INVALID', `${path}.key`, 'Node key must be a string.')
  }

  if (value.props !== undefined) {
    if (!isPlainObject(value.props)) {
      issue(issues, 'error', 'PROPS_INVALID', `${path}.props`, 'Props must be an object.')
    } else {
      for (const [key, propValue] of Object.entries(value.props)) {
        isJsonValue(propValue, `${path}.props.${key}`, issues, new Set())
      }
      if (type === 'text' && typeof value.props.text !== 'string') {
        issue(issues, 'error', 'TEXT_PROP_MISSING', `${path}.props.text`, 'Text node requires string prop "text".')
      }
    }
  } else if (type === 'text') {
    issue(issues, 'error', 'TEXT_PROP_MISSING', `${path}.props.text`, 'Text node requires string prop "text".')
  }

  if (value.style !== undefined) {
    if (!isPlainObject(value.style)) {
      issue(issues, 'error', 'STYLE_INVALID', `${path}.style`, 'Style must be an object.')
    } else {
      for (const [key, styleValue] of Object.entries(value.style)) {
        if (!STYLE_KEY_SET.has(key)) {
          issue(
            issues,
            'warning',
            'STYLE_KEY_UNKNOWN',
            `${path}.style.${key}`,
            `Unknown style key "${key}".`,
          )
        }
        isJsonValue(styleValue, `${path}.style.${key}`, issues, new Set())
      }
    }
  }

  if (value.bindings !== undefined) {
    if (!isPlainObject(value.bindings)) {
      issue(issues, 'error', 'BINDINGS_INVALID', `${path}.bindings`, 'Bindings must be an object.')
    } else {
      for (const [key, binding] of Object.entries(value.bindings)) {
        if (!isPlainObject(binding) || typeof binding.source !== 'string' || binding.source.length === 0) {
          issue(
            issues,
            'error',
            'BINDING_INVALID',
            `${path}.bindings.${key}`,
            'Binding requires a non-empty source string.',
          )
        }
      }
    }
  }

  if (value.events !== undefined) {
    if (!isPlainObject(value.events)) {
      issue(issues, 'error', 'EVENTS_INVALID', `${path}.events`, 'Events must be an object.')
    } else {
      for (const [key, event] of Object.entries(value.events)) {
        if (!isPlainObject(event) || typeof event.action !== 'string' || event.action.length === 0) {
          issue(
            issues,
            'error',
            'EVENT_INVALID',
            `${path}.events.${key}`,
            'Event requires a non-empty action string.',
          )
        }
      }
    }
  }

  if (value.meta !== undefined && !isPlainObject(value.meta)) {
    issue(issues, 'error', 'META_INVALID', `${path}.meta`, 'Meta must be an object.')
  }

  if (value.children !== undefined) {
    if (type === 'text') {
      issue(issues, 'error', 'TEXT_CHILDREN_FORBIDDEN', `${path}.children`, 'Text node must not have children.')
    }
    if (!Array.isArray(value.children)) {
      issue(issues, 'error', 'CHILDREN_INVALID', `${path}.children`, 'Children must be an array.')
    } else {
      value.children.forEach((child, index) => {
        validateNode(child, `${path}.children[${index}]`, issues, seenIds, activeNodes)
      })
    }
  }

  activeNodes.delete(value)
}

export function validateDocument(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!isPlainObject(value)) {
    return [
      {
        code: 'DOCUMENT_INVALID',
        path: '',
        message: 'Document must be an object.',
        severity: 'error',
      },
    ]
  }

  if (value.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    issue(
      issues,
      'error',
      'SCHEMA_VERSION_UNSUPPORTED',
      'schemaVersion',
      `Expected "${DOCUMENT_SCHEMA_VERSION}", received "${String(value.schemaVersion)}".`,
    )
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    issue(issues, 'error', 'DOCUMENT_ID_MISSING', 'id', 'Document id must be a non-empty string.')
  }
  if (typeof value.name !== 'string') {
    issue(issues, 'error', 'DOCUMENT_NAME_INVALID', 'name', 'Document name must be a string.')
  }
  if (
    typeof value.revision !== 'number' ||
    !Number.isInteger(value.revision) ||
    value.revision < 0
  ) {
    issue(issues, 'error', 'REVISION_INVALID', 'revision', 'Revision must be a non-negative integer.')
  }

  if (value.metadata !== undefined) {
    isJsonValue(value.metadata, 'metadata', issues, new Set())
  }

  if (value.theme !== undefined) {
    if (!isPlainObject(value.theme)) {
      issue(issues, 'error', 'THEME_INVALID', 'theme', 'Theme must be an object.')
    } else {
      if (value.theme.colors !== undefined) {
        if (!isPlainObject(value.theme.colors)) {
          issue(issues, 'error', 'THEME_COLORS_INVALID', 'theme.colors', 'Theme colors must be an object.')
        } else {
          for (const [key, color] of Object.entries(value.theme.colors)) {
            if (typeof color !== 'string') {
              issue(issues, 'error', 'THEME_COLOR_INVALID', `theme.colors.${key}`, 'Theme color must be a string.')
            }
          }
        }
      }
      if (value.theme.radii !== undefined) {
        if (!isPlainObject(value.theme.radii)) {
          issue(issues, 'error', 'THEME_RADII_INVALID', 'theme.radii', 'Theme radii must be an object.')
        } else {
          for (const [key, radius] of Object.entries(value.theme.radii)) {
            if (typeof radius !== 'number') {
              issue(issues, 'error', 'THEME_RADIUS_INVALID', `theme.radii.${key}`, 'Theme radius must be a number.')
            }
          }
        }
      }
    }
  }

  if (!Array.isArray(value.pages) || value.pages.length === 0) {
    issue(issues, 'error', 'PAGES_EMPTY', 'pages', 'Document must contain at least one page.')
    return issues
  }

  const pageIds = new Set<string>()
  const nodeIds = new Set<string>()

  value.pages.forEach((page, pageIndex) => {
    const pagePath = `pages[${pageIndex}]`
    if (!isPlainObject(page)) {
      issue(issues, 'error', 'PAGE_INVALID', pagePath, 'Page must be an object.')
      return
    }
    if (typeof page.id !== 'string' || page.id.length === 0) {
      issue(issues, 'error', 'PAGE_ID_MISSING', `${pagePath}.id`, 'Page id must be a non-empty string.')
    } else if (pageIds.has(page.id)) {
      issue(issues, 'error', 'PAGE_ID_DUPLICATE', `${pagePath}.id`, `Duplicate page id "${page.id}".`)
    } else {
      pageIds.add(page.id)
    }
    if (typeof page.name !== 'string') {
      issue(issues, 'error', 'PAGE_NAME_INVALID', `${pagePath}.name`, 'Page name must be a string.')
    }
    if (page.root === undefined) {
      issue(issues, 'error', 'PAGE_ROOT_MISSING', `${pagePath}.root`, 'Page requires a root node.')
      return
    }
    validateNode(page.root, `${pagePath}.root`, issues, nodeIds, new Set())
  })

  return issues
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((item) => item.severity === 'error')
}

export function assertValidDocument(value: unknown): asserts value is UIDocument {
  const issues = validateDocument(value)
  if (hasErrors(issues)) {
    const detail = issues
      .filter((item) => item.severity === 'error')
      .map((item) => `${item.path}: ${item.message}`)
      .join('; ')
    throw new Error(`Invalid Virtual UI document: ${detail}`)
  }
}

export function collectNodeIds(root: UINode, result: string[] = []): string[] {
  result.push(root.id)
  root.children?.forEach((child) => collectNodeIds(child, result))
  return result
}
