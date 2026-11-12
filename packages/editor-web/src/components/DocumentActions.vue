<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationIssue } from '@vui/core'
import { BrowserFilePersistence } from '@vui/editor-core'
import { documentRef, replaceDocument } from '../editor/editor-instance'
import IconButton from './ui/IconButton.vue'

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
    errorTitle.value = '导出失败'
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
    errorTitle.value = `导入失败：${file.name}`
    problems.value = result.issues
    return
  }

  replaceDocument(result.document)
}
</script>

<template>
  <div class="document-actions">
    <IconButton
      icon="export"
      label="导出 JSON"
      data-testid="export-button"
      @click="handleExport"
    />
    <IconButton
      icon="import"
      label="导入 JSON"
      data-testid="import-button"
      @click="openImport"
    />
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
        <IconButton
          icon="close"
          label="关闭错误提示"
          @click="clearProblems"
        />
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
  align-items: center;
  gap: 2px;
}

.document-file-input {
  display: none;
}

.document-errors {
  position: fixed;
  top: calc(var(--header-height) + 8px);
  right: 12px;
  z-index: 50;
  width: 380px;
  max-height: 50vh;
  overflow: auto;
  border: 1px solid var(--color-error-border);
  border-radius: var(--radius-md);
  background: var(--color-panel-secondary);
  color: var(--color-error);
  box-shadow: var(--floating-bar-shadow);
  font-size: var(--text-2xs);
}

.document-errors-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 6px 6px 10px;
  border-bottom: 1px solid var(--color-error-border);
  font-weight: 600;
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
  color: var(--color-error);
  font-family: var(--font-mono);
  font-size: var(--text-3xs);
  opacity: 0.8;
}
</style>
