import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isBannedSpecifier, scanRepository } from './banned-deps.mjs'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(currentDir, '..', 'test-fixtures')

describe('isBannedSpecifier', () => {
  it('blocks OpenPencil package names', () => {
    expect(isBannedSpecifier('@open-pencil/core')).toBe(true)
    expect(isBannedSpecifier('@open-pencil/cli')).toBe(true)
    expect(isBannedSpecifier('open-pencil')).toBe(true)
    expect(isBannedSpecifier('open-pencil/runtime')).toBe(true)
  })

  it('allows unrelated package names', () => {
    expect(isBannedSpecifier('vue')).toBe(false)
    expect(isBannedSpecifier('@vui/core')).toBe(false)
    expect(isBannedSpecifier('pencil-case')).toBe(false)
  })
})

describe('scanRepository', () => {
  it('returns no findings for a clean fixture', () => {
    expect(scanRepository(path.join(fixturesDir, 'clean'))).toEqual([])
  })

  it('finds dependency, import and lockfile references', () => {
    const findings = scanRepository(path.join(fixturesDir, 'banned'))
    const kinds = new Set(findings.map((finding) => finding.kind))

    expect(kinds).toEqual(new Set(['dependency', 'import', 'lockfile']))
    expect(
      findings.some((finding) => finding.file.endsWith('package.json')),
    ).toBe(true)
    expect(findings.some((finding) => finding.file.endsWith('source.ts'))).toBe(
      true,
    )
    expect(
      findings.some((finding) => finding.file.endsWith('pnpm-lock.yaml')),
    ).toBe(true)
    expect(findings.every((finding) => finding.line > 0)).toBe(true)
  })
})
