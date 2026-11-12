import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function layerIds(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid^="layer-"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')))
}

const ORIGINAL_LAYERS = [
  'layer-login-root',
  'layer-login-card',
  'layer-login-title',
  'layer-username',
  'layer-password',
  'layer-submit',
]

test('inserts a component into the selected container and selects it', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByTestId('layer-login-card').click()
  await page.getByTestId('palette-Input').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  await expect(page.getByTestId('properties-node-id')).toHaveText(/^node-/)

  const inserted = page.locator(
    '[data-testid^="layer-"][data-selected="true"]',
  )
  await expect(inserted).toContainText('Input')

  const ids = await layerIds(page)
  expect(ids).toHaveLength(7)
  expect(ids.slice(0, 6)).toEqual(ORIGINAL_LAYERS)
  expect(ids[6]).toMatch(/^layer-node-/)

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})

test('deletes a subtree and undo restores it in one step', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('layer-login-card').click()
  await page.getByTestId('delete-button').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  await expect(page.getByTestId('layer-login-card')).toHaveCount(0)
  await expect(page.getByTestId('layer-submit')).toHaveCount(0)
  await expect(page.getByTestId('properties-empty')).toBeVisible()

  await page.getByTestId('undo-button').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.getByTestId('layer-login-card')).toBeVisible()
  await expect(page.getByTestId('layer-submit')).toBeVisible()
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})

test('moves a node across levels and preserves its props', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('layer-username').click()
  await page.getByTestId('move-out-button').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  expect(await layerIds(page)).toEqual([
    'layer-login-root',
    'layer-login-card',
    'layer-login-title',
    'layer-password',
    'layer-submit',
    'layer-username',
  ])

  await expect(page.getByTestId('properties-node-id')).toHaveText('username')
  await expect(page.getByTestId('prop-placeholder')).toHaveValue('用户名')

  await page.getByTestId('undo-button').click()
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})

test('reorders siblings with move up and down', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('layer-password').click()
  await page.getByTestId('move-up-button').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  expect(await layerIds(page)).toEqual([
    'layer-login-root',
    'layer-login-card',
    'layer-login-title',
    'layer-password',
    'layer-username',
    'layer-submit',
  ])

  await page.getByTestId('move-down-button').click()

  await expect(page.getByTestId('revision')).toHaveText('修订 2')
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)

  await page.getByTestId('undo-button').click()
  await page.getByTestId('undo-button').click()
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})
