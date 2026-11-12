import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

test('shell renders a dark canvas with exactly three core tools', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByTestId('canvas-toolbar')).toBeVisible()
  const tools = page.locator('[data-testid="canvas-toolbar"] button')
  await expect(tools).toHaveCount(3)

  await expect(page.getByTestId('tool-select')).toHaveAttribute(
    'title',
    '选择 (V)',
  )
  await expect(page.getByTestId('tool-hand')).toHaveAttribute(
    'title',
    '抓手 (H)',
  )
  await expect(page.getByTestId('tool-text')).toHaveAttribute(
    'title',
    '文本 (T)',
  )
  await expect(page.getByTestId('tool-select')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await expect(page.locator('.canvas-viewport')).toHaveCSS(
    'background-color',
    'rgb(30, 30, 30)',
  )
  await expect(page.getByTestId('canvas-stage')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  )
})

test('text tool inserts a Text node at the click point and undo removes it', async ({
  page,
}) => {
  await page.goto('/')

  await page.keyboard.press('t')
  await expect(page.getByTestId('tool-text')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const stage = await page.getByTestId('canvas-stage').boundingBox()
  expect(stage).not.toBeNull()

  await page.mouse.click(stage!.x + 120, stage!.y + 120)

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  await expect(page.getByTestId('selection-label')).toHaveText(/^text-/)
  await expect(page.getByTestId('properties-node-id')).toHaveText(/^text-/)
  await expect(page.getByTestId('tool-select')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const selectedLayer = page.locator(
    '[data-testid^="layer-"][data-selected="true"]',
  )
  await expect(selectedLayer).toContainText('Text')

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(
    page.locator('[data-testid^="layer-"][data-selected="true"]'),
  ).toHaveCount(0)
})

test('selection overlay stays aligned with the node at 50% zoom', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByTestId('zoom-select').click()
  await page.getByTestId('zoom-option-50').click()
  await expect(page.getByTestId('zoom-select')).toContainText('50%')

  await page.getByTestId('layer-username').click()

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

test('absolute drag converts screen delta back to artboard units at 50% zoom', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByTestId('import-input')
    .setInputFiles(resolve(process.cwd(), 'fixtures/absolute.page.json'))
  await expect(page.getByTestId('document-name')).toHaveText('Absolute Page')

  await page.getByTestId('zoom-select').click()
  await page.getByTestId('zoom-option-50').click()
  await expect(page.getByTestId('zoom-select')).toContainText('50%')

  const card = await page.locator('[data-node-id="absolute-card"]').boundingBox()
  expect(card).not.toBeNull()

  await page.mouse.move(card!.x + 20, card!.y + 20)
  await page.mouse.down()
  await page.mouse.move(card!.x + 120, card!.y + 100, { steps: 10 })
  await page.mouse.up()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  await expect(page.getByTestId('style-left')).toHaveValue('280')
  await expect(page.getByTestId('style-top')).toHaveValue('220')
})

test('arrow keys nudge absolute nodes by 1px and 10px with shift', async ({
  page,
}) => {  await page.goto('/')
  await page
    .getByTestId('import-input')
    .setInputFiles(resolve(process.cwd(), 'fixtures/absolute.page.json'))
  await expect(page.getByTestId('document-name')).toHaveText('Absolute Page')

  await page.locator('[data-node-id="absolute-card"]').click()
  await page.getByTestId('tool-select').click()

  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('style-left')).toHaveValue('81')
  await expect(page.getByTestId('revision')).toHaveText('修订 1')

  await page.keyboard.press('Shift+ArrowDown')
  await expect(page.getByTestId('style-top')).toHaveValue('70')
  await expect(page.getByTestId('revision')).toHaveText('修订 2')

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('style-top')).toHaveValue('60')
  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('style-left')).toHaveValue('80')
})

test('holding space and dragging pans the artboard without editing it', async ({
  page,
}) => {
  await page.goto('/')

  const stageBefore = await page.getByTestId('canvas-stage').boundingBox()
  const viewport = await page.getByTestId('canvas-viewport').boundingBox()
  expect(stageBefore).not.toBeNull()
  expect(viewport).not.toBeNull()

  const startX = viewport!.x + viewport!.width / 2
  const startY = viewport!.y + viewport!.height / 2

  await page.keyboard.down('Space')
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 80, startY + 40, { steps: 8 })
  await page.mouse.up()
  await page.keyboard.up('Space')

  const stageAfter = await page.getByTestId('canvas-stage').boundingBox()
  expect(stageAfter).not.toBeNull()
  expect(Math.abs(stageAfter!.x - (stageBefore!.x + 80))).toBeLessThanOrEqual(2)
  expect(Math.abs(stageAfter!.y - (stageBefore!.y + 40))).toBeLessThanOrEqual(2)
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
})
