import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

test('acceptance: main editing loop completes without console errors', async ({
  page,
}) => {
  const errors = trackErrors(page)
  await page.goto('/')

  await expect(page.getByTestId('document-name')).toHaveText('Login Page')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.getByTestId('layer-login-card')).toBeVisible()

  await page.locator('[data-node-id="submit"]').click()
  await expect(page.getByTestId('layer-submit')).toHaveAttribute(
    'data-selected',
    'true',
  )
  await expect(page.getByTestId('selection-box')).toBeVisible()

  await page.getByTestId('layer-login-title').click()
  await page.locator('[data-node-id="login-title"]').hover()
  await expect(page.getByTestId('selection-label')).toHaveText('login-title')

  await page.getByTestId('layer-submit').click()
  await page.getByTestId('prop-label').fill('验收')
  await page.getByTestId('style-backgroundColor').fill('#16a34a')
  await expect(page.getByTestId('revision')).toHaveText('修订 2')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('验收')
  await expect(page.locator('[data-node-id="submit"]')).toHaveCSS(
    'background-color',
    'rgb(22, 163, 74)',
  )

  await page.getByTestId('undo-button').click()
  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('登录')

  await page.getByTestId('redo-button').click()
  await page.getByTestId('redo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 2')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('验收')

  await page.getByTestId('layer-login-card').click()
  await page.getByTestId('palette-Text').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 3')
  await expect(
    page.locator('[data-testid^="layer-"][data-selected="true"]'),
  ).toContainText('Text')
  await page.getByTestId('delete-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 4')
  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 3')
  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 2')

  expect(errors).toEqual([])
})

test('acceptance: event definitions render inert and unknown actions do not crash', async ({
  page,
}, testInfo) => {
  const errors = trackErrors(page)

  const eventDocument = {
    schemaVersion: '0.1.0',
    id: 'doc-events',
    name: 'Events Page',
    revision: 0,
    pages: [
      {
        id: 'page-events',
        name: 'Events',
        root: {
          id: 'events-root',
          type: 'element',
          tag: 'div',
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 16,
          },
          children: [
            {
              id: 'event-label',
              type: 'component',
              component: 'Text',
              props: { text: 'Event target', as: 'p' },
            },
            {
              id: 'event-button',
              type: 'component',
              component: 'Button',
              props: { label: 'Run action' },
              events: {
                click: {
                  action: 'not-registered-action',
                  params: { payload: 'demo' },
                },
              },
            },
            {
              id: 'unknown-widget',
              type: 'component',
              component: 'NotRegistered',
              style: { padding: 8 },
            },
          ],
        },
      },
    ],
  }

  const documentPath = testInfo.outputPath('events.page.json')
  await writeFile(documentPath, JSON.stringify(eventDocument), 'utf8')

  await page.goto('/')
  await page.getByTestId('import-input').setInputFiles(documentPath)

  await expect(page.getByTestId('document-name')).toHaveText('Events Page')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.locator('[data-node-id="event-button"]')).toHaveText(
    'Run action',
  )
  await expect(page.locator('[data-node-id="unknown-widget"]')).toHaveAttribute(
    'data-unknown-component',
    'NotRegistered',
  )
  await expect(page.locator('[data-node-id="unknown-widget"]')).toContainText(
    'Unknown component: NotRegistered',
  )

  await page.locator('[data-node-id="event-button"]').click()
  await expect(page.getByTestId('selection-label')).toHaveText('event-button')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.locator('[data-node-id="event-button"]')).toHaveText(
    'Run action',
  )

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-button').click()
  const download = await downloadPromise
  const exportPath = await download.path()
  expect(exportPath).not.toBeNull()

  const exported = JSON.parse(await readFile(exportPath!, 'utf8')) as {
    revision: number
    pages: Array<{
      root: {
        children: Array<{
          id: string
          events?: { click?: { action?: string; params?: unknown } }
        }>
      }
    }>
  }
  const exportedButton = exported.pages[0].root.children[1]
  expect(exported.revision).toBe(0)
  expect(exportedButton.id).toBe('event-button')
  expect(exportedButton.events?.click?.action).toBe('not-registered-action')
  expect(exportedButton.events?.click?.params).toEqual({ payload: 'demo' })

  expect(errors).toEqual([])
})

test('acceptance: invalid import is rejected with readable paths', async ({
  page,
}) => {
  const errors = trackErrors(page)
  await page.goto('/')

  await page
    .getByTestId('import-input')
    .setInputFiles(resolve(process.cwd(), 'fixtures/login.page.invalid.json'))

  await expect(page.getByTestId('document-errors')).toBeVisible()

  const messages = await page.getByTestId('document-error').allTextContents()
  expect(messages.length).toBeGreaterThan(1)
  expect(messages.some((message) => message.includes('schemaVersion'))).toBe(
    true,
  )
  expect(messages.some((message) => message.includes('events.click'))).toBe(
    true,
  )

  await expect(page.getByTestId('document-name')).toHaveText('Login Page')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('登录')

  await page.getByLabel('关闭错误提示').click()
  await expect(page.getByTestId('document-errors')).toHaveCount(0)

  expect(errors).toEqual([])
})
