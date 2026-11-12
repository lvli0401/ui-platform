import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const FORBIDDEN_KEYS = [
  'selectedNodeIds',
  'selectedIds',
  'hoveredNodeId',
  'drag',
  'dragState',
  'overlay',
  'viewport',
  'canvasTransform',
]

function collectForbiddenKeys(value: unknown, path = 'document'): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenKeys(item, `${path}[${index}]`),
    )
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => {
      const nextPath = `${path}.${key}`
      return [
        ...(FORBIDDEN_KEYS.includes(key) ? [nextPath] : []),
        ...collectForbiddenKeys(item, nextPath),
      ]
    })
  }
  return []
}

test('walking skeleton: edit, export, reload, import, re-export deterministically', async ({
  page,
}) => {
  await page.goto('/')

  await page.locator('[data-node-id="submit"]').click()
  await page.getByTestId('prop-label').fill('进入')
  await page.getByTestId('style-backgroundColor').fill('#ef4444')
  await expect(page.getByTestId('revision')).toHaveText('修订 2')

  const firstDownloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-button').click()
  const firstDownload = await firstDownloadPromise
  expect(firstDownload.suggestedFilename()).toBe('login-page.json')

  const firstPath = await firstDownload.path()
  expect(firstPath).not.toBeNull()
  const firstExport = await readFile(firstPath!, 'utf8')
  const firstDocument = JSON.parse(firstExport) as {
    revision: number
    pages: Array<{
      root: {
        children: Array<{
          children: Array<{ props?: { label?: string }; style?: { backgroundColor?: string } }>
        }>
      }
    }>
  }

  expect(firstDocument.revision).toBe(2)
  expect(collectForbiddenKeys(firstDocument)).toEqual([])
  expect(
    firstDocument.pages[0].root.children[0].children[3].props?.label,
  ).toBe('进入')
  expect(
    firstDocument.pages[0].root.children[0].children[3].style?.backgroundColor,
  ).toBe('#ef4444')

  await page.reload()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')

  await page.getByTestId('import-input').setInputFiles(firstPath!)

  await expect(page.getByTestId('document-name')).toHaveText('Login Page')
  await expect(page.getByTestId('revision')).toHaveText('修订 2')
  await expect(page.getByTestId('properties-empty')).toBeVisible()

  await page.locator('[data-node-id="submit"]').click()
  await expect(page.getByTestId('prop-label')).toHaveValue('进入')
  await expect(page.locator('[data-node-id="submit"]')).toHaveCSS(
    'background-color',
    'rgb(239, 68, 68)',
  )

  const secondDownloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-button').click()
  const secondDownload = await secondDownloadPromise
  const secondPath = await secondDownload.path()
  expect(secondPath).not.toBeNull()
  const secondExport = await readFile(secondPath!, 'utf8')

  expect(secondExport).toBe(firstExport)
})

test('invalid import shows issue paths and keeps the current document', async ({
  page,
}) => {
  await page.goto('/')

  await page
    .getByTestId('import-input')
    .setInputFiles(resolve(process.cwd(), 'fixtures/login.page.invalid.json'))

  await expect(page.getByTestId('document-errors')).toBeVisible()
  await expect(page.getByTestId('document-error').first()).toContainText(
    'schemaVersion',
  )

  const errorCount = await page.getByTestId('document-error').count()
  expect(errorCount).toBeGreaterThan(1)

  await expect(page.getByTestId('document-name')).toHaveText('Login Page')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('登录')
})
