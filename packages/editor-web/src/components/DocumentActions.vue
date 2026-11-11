<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationIssue } from '@vui/core'
import { BrowserFilePersistence } from '@vui/editor-core'
import { documentRef, replaceDocument } from '../editor/editor-instance'

const persistence = new BrowserFilePersistence()
const fileInput = ref<HTMLInputElement | null>(null)
const problems = ref<ValidationIssue[]>([])
const errorTitle = ref('')

function clearProblems(): void {
  problems.value = []
  errorTitle.value = ''
}

async function handleExport(): Promise<void> {
  clearProblems()
  try {
    await persistence.save(documentRef.value)
  } catch (error) {
    errorTitle.value = 'Export failed'
    problems.value = [
      {
        code: 'EXPORT_ERROR',
        path: '',
        severity: 'error',
        message:
          error instanceof Error ? error.message : 'Unknown export error.',
      },
    ]
  }
}

function openImport(): void {
  fileInput.value?.click()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  clearProblems()
  const result = await persistence.load(file)
  if (!result.ok) {
    errorTitle.value = `Import failed: ${file.name}`
    problems.value = result.issues
    return
  }

  replaceDocument(result.document)
}
</script>

<template>
  <div class="document-actions">
    <button
      type="button"
      class="document-button"
      data-testid="export-button"
      @click="handleExport"
    >
      Export JSON
    </button>
    <button
      type="button"
      class="document-button"
      data-testid="import-button"
      @click="openImport"
    >
      Import JSON
    </button>
    <input
      ref="fileInput"
      class="document-file-input"
      type="file"
      accept="application/json,.json"
      data-testid="import-input"
      @change="handleFileChange"
    />

    <div
      v-if="problems.length > 0"
      class="document-errors"
      data-testid="document-errors"
      role="alert"
    >
      <header class="document-errors-header">
        <span>{{ errorTitle }}</span>
        <button
          type="button"
          class="document-errors-close"
          aria-label="Dismiss errors"
          @click="clearProblems"
        >
          ×
        </button>
      </header>
      <ul class="document-errors-list">
        <li
          v-for="(problem, index) in problems"
          :key="`${problem.code}:${problem.path}:${index}`"
          class="document-error"
          data-testid="document-error"
        >
          <code class="document-error-path">{{ problem.path || '/' }}</code>
          <span>{{ problem.message }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.document-actions {
  display: flex;
  gap: 6px;
  margin-left: 16px;
}

.document-button {
  padding: 3px 9px;
  border: 1px solid #334155;
  border-radius: 5px;
  background: #0f172a;
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

.document-button:hover {
  border-color: #475569;
  background: #1e293b;
}

.document-file-input {
  display: none;
}

.document-errors {
  position: fixed;
  top: 52px;
  right: 12px;
  z-index: 50;
  width: 380px;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #7f1d1d;
  box-shadow: 0 10px 25px rgb(15 23 42 / 15%);
  font-size: 12px;
}

.document-errors-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-bottom: 1px solid #fecaca;
  font-weight: 600;
}

.document-errors-close {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.document-errors-list {
  margin: 0;
  padding: 8px 10px 10px 24px;
}

.document-error {
  margin: 3px 0;
}

.document-error-path {
  margin-right: 6px;
  color: #b91c1c;
  font-family: ui-monospace, monospace;
  font-size: 10px;
}
</style>
