import { expect, test } from '@playwright/test'

test('canvas click selects a node and syncs the Layers panel', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')

  await expect(page.getByTestId('document-name')).toHaveText('Login Page')
  await expect(page.locator('[data-node-id="submit"]')).toBeVisible()

  await page.locator('[data-node-id="submit"]').click()

  await expect(page.getByTestId('layer-submit')).toHaveAttribute(
    'data-selected',
    'true',
  )
  await expect(page.getByTestId('selection-label')).toHaveText('submit')
  await expect(page.getByTestId('selection-box')).toHaveAttribute(
    'data-selected-node',
    'submit',
  )
  await expect(page.getByTestId('selection-box')).toBeVisible()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')

  expect(consoleErrors).toEqual([])
})

test('Layers click selects the node and draws the canvas selection box', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByTestId('layer-username').click()

  await expect(page.getByTestId('selection-box')).toHaveAttribute(
    'data-selected-node',
    'username',
  )
  await expect(page.locator('[data-node-id="username"]')).toBeVisible()

  const nodeBox = await page.locator('[data-node-id="username"]').boundingBox()
  const selectionBox = await page.getByTestId('selection-box').boundingBox()

  expect(nodeBox).not.toBeNull()
  expect(selectionBox).not.toBeNull()
  expect(Math.abs(selectionBox!.x - nodeBox!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(selectionBox!.y - nodeBox!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(selectionBox!.width - nodeBox!.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(selectionBox!.height - nodeBox!.height)).toBeLessThanOrEqual(
    1,
  )
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
})

test('Layers order mirrors the document tree and hover stays editor-only', async ({
  page,
}) => {
  await page.goto('/')

  const layerIds = await page
    .locator('[data-testid^="layer-"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-testid')))

  expect(layerIds).toEqual([
    'layer-login-root',
    'layer-login-card',
    'layer-login-title',
    'layer-username',
    'layer-password',
    'layer-submit',
  ])

  await page.locator('[data-node-id="password"]').hover()

  await expect(page.getByTestId('hover-box')).toHaveAttribute(
    'data-hovered-node',
    'password',
  )
  await expect(page.getByTestId('selection-label')).toHaveText('未选择')
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
})
