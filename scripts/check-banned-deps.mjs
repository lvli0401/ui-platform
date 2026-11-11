#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { scanRepository } from './lib/banned-deps.mjs'

const rootDir = path.resolve(process.argv[2] ?? process.cwd())
const findings = scanRepository(rootDir)

if (findings.length === 0) {
  console.log('banned-deps: ok, no OpenPencil references found')
  process.exit(0)
}

console.error(`banned-deps: found ${findings.length} forbidden reference(s)`)
for (const finding of findings) {
  console.error(
    `${finding.file}:${finding.line} [${finding.kind}] ${finding.match}`,
  )
}
process.exit(1)
