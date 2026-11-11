import { expect, test } from '@playwright/test'

test('edits props and styles through commands with undo and redo', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByTestId('properties-empty')).toBeVisible()

  await page.locator('[data-node-id="submit"]').click()

  await expect(page.getByTestId('properties-node-id')).toHaveText('submit')
  await expect(page.getByTestId('prop-label')).toHaveValue('登录')

  await page.getByTestId('prop-label').fill('进入')
  await expect(page.getByTestId('revision')).toHaveText('revision 1')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('进入')

  await page.getByTestId('style-backgroundColor').fill('#ef4444')
  await expect(page.getByTestId('revision')).toHaveText('revision 2')
  await expect(page.locator('[data-node-id="submit"]')).toHaveCSS(
    'background-color',
    'rgb(239, 68, 68)',
  )

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('revision 1')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('进入')
  await expect(page.locator('[data-node-id="submit"]')).toHaveCSS(
    'background-color',
    'rgb(37, 99, 235)',
  )

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('revision 0')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('登录')

  await page.getByTestId('redo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('revision 1')
  await expect(page.locator('[data-node-id="submit"]')).toHaveText('进入')
})

test('edits enum and boolean props from the schema-driven panel', async ({
  page,
}) => {
  await page.goto('/')

  await page.locator('[data-node-id="password"]').click()
  await expect(page.getByTestId('prop-type')).toHaveValue('password')

  await page.getByTestId('prop-type').selectOption('text')
  await expect(page.locator('[data-node-id="password"]')).toHaveAttribute(
    'type',
    'text',
  )
  await expect(page.getByTestId('revision')).toHaveText('revision 1')

  await page.locator('[data-node-id="submit"]').click()
  await page.getByTestId('prop-disabled').check()

  await expect(page.locator('[data-node-id="submit"]')).toBeDisabled()
  await expect(page.getByTestId('revision')).toHaveText('revision 2')

  await page.getByTestId('undo-button').click()
  await expect(page.locator('[data-node-id="submit"]')).toBeEnabled()
  await expect(page.getByTestId('revision')).toHaveText('revision 1')
})
