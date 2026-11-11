import fs from 'node:fs'
import path from 'node:path'

const SCANNED_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.vue'])
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
  '.vite',
])
const IGNORED_RELATIVE_PATHS = new Set(['scripts/test-fixtures'])

const IMPORT_SPECIFIER_PATTERN =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g

export function isBannedSpecifier(specifier) {
  return (
    specifier.startsWith('@open-pencil/') ||
    specifier === 'open-pencil' ||
    specifier.startsWith('open-pencil/')
  )
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function shouldIgnore(relativePath) {
  const posixPath = toPosix(relativePath)
  for (const ignoredPath of IGNORED_RELATIVE_PATHS) {
    if (posixPath === ignoredPath || posixPath.startsWith(`${ignoredPath}/`)) {
      return true
    }
  }
  return posixPath
    .split('/')
    .some((segment) => IGNORED_DIRECTORIES.has(segment))
}

function walk(rootDir, currentDir, files) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = path.join(currentDir, entry.name)
    const relativePath = toPosix(path.relative(rootDir, absolutePath))
    if (shouldIgnore(relativePath)) continue
    if (entry.isDirectory()) {
      walk(rootDir, absolutePath, files)
    } else if (entry.isFile()) {
      files.push({ absolutePath, relativePath })
    }
  }
}

function lineOf(text, needle) {
  const lines = text.split('\n')
  const index = lines.findIndex((line) => line.includes(needle))
  return index === -1 ? 1 : index + 1
}

function scanPackageJson(findings, file, text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return
  }

  const fields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]

  for (const field of fields) {
    const dependencies = parsed[field]
    if (!dependencies || typeof dependencies !== 'object') continue
    for (const name of Object.keys(dependencies)) {
      if (!isBannedSpecifier(name)) continue
      findings.push({
        file: file.relativePath,
        line: lineOf(text, name),
        match: name,
        kind: 'dependency',
      })
    }
  }
}

function scanLockfile(findings, file, text) {
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    if (!line.includes('open-pencil')) return
    findings.push({
      file: file.relativePath,
      line: index + 1,
      match: line.trim().slice(0, 160),
      kind: 'lockfile',
    })
  })
}

function scanSource(findings, file, text) {
  IMPORT_SPECIFIER_PATTERN.lastIndex = 0
  for (const match of text.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const specifier = match[1]
    if (!isBannedSpecifier(specifier)) continue
    const index = match.index ?? 0
    findings.push({
      file: file.relativePath,
      line: text.slice(0, index).split('\n').length,
      match: specifier,
      kind: 'import',
    })
  }
}

export function scanRepository(rootDir) {
  const files = []
  walk(rootDir, rootDir, files)
  const findings = []

  for (const file of files) {
    const baseName = path.basename(file.absolutePath)
    const extension = path.extname(file.absolutePath)

    if (baseName === 'package.json') {
      scanPackageJson(findings, file, fs.readFileSync(file.absolutePath, 'utf8'))
      continue
    }

    if (baseName === 'pnpm-lock.yaml') {
      scanLockfile(findings, file, fs.readFileSync(file.absolutePath, 'utf8'))
      continue
    }

    if (SCANNED_SOURCE_EXTENSIONS.has(extension)) {
      scanSource(findings, file, fs.readFileSync(file.absolutePath, 'utf8'))
    }
  }

  return findings
}
