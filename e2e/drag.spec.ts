import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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

test('flex drag within a container commits one move and undo restores order', async ({
  page,
}) => {
  await page.goto('/')

  const submit = await page.locator('[data-node-id="submit"]').boundingBox()
  const username = await page.locator('[data-node-id="username"]').boundingBox()
  expect(submit).not.toBeNull()
  expect(username).not.toBeNull()

  await page.mouse.move(
    submit!.x + submit!.width / 2,
    submit!.y + submit!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(username!.x + username!.width / 2, username!.y + 2, {
    steps: 10,
  })

  await expect(page.getByTestId('drag-preview')).toBeVisible()
  await expect(page.getByTestId('drop-marker')).toBeVisible()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)

  await page.mouse.up()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  expect(await layerIds(page)).toEqual([
    'layer-login-root',
    'layer-login-card',
    'layer-login-title',
    'layer-submit',
    'layer-username',
    'layer-password',
  ])
  await expect(page.getByTestId('drag-preview')).toHaveCount(0)

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})

test('flex drag moves a node into another flex parent', async ({ page }) => {
  await page.goto('/')

  const submit = await page.locator('[data-node-id="submit"]').boundingBox()
  const stage = await page.getByTestId('canvas-stage').boundingBox()
  expect(submit).not.toBeNull()
  expect(stage).not.toBeNull()

  await page.mouse.move(
    submit!.x + submit!.width / 2,
    submit!.y + submit!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(stage!.x + 20, stage!.y + 20, { steps: 12 })
  await page.mouse.up()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  expect(await layerIds(page)).toEqual([
    'layer-login-root',
    'layer-submit',
    'layer-login-card',
    'layer-login-title',
    'layer-username',
    'layer-password',
  ])

  await page.getByTestId('undo-button').click()
  expect(await layerIds(page)).toEqual(ORIGINAL_LAYERS)
})

test('absolute drag updates left and top once, and undo restores them', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByTestId('import-input')
    .setInputFiles(resolve(process.cwd(), 'fixtures/absolute.page.json'))

  await expect(page.getByTestId('document-name')).toHaveText('Absolute Page')

  const card = await page.locator('[data-node-id="absolute-card"]').boundingBox()
  expect(card).not.toBeNull()

  await page.mouse.move(card!.x + 5, card!.y + 5)
  await page.mouse.down()
  await page.mouse.move(card!.x + 105, card!.y + 85, { steps: 10 })

  await expect(page.getByTestId('drag-preview')).toHaveAttribute(
    'data-drag-mode',
    'absolute',
  )
  await expect(page.getByTestId('revision')).toHaveText('修订 0')

  await page.mouse.up()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')
  await expect(page.getByTestId('properties-node-id')).toHaveText(
    'absolute-card',
  )
  await expect(page.getByTestId('style-left')).toHaveValue('180')
  await expect(page.getByTestId('style-top')).toHaveValue('140')

  await page.getByTestId('undo-button').click()
  await expect(page.getByTestId('revision')).toHaveText('修订 0')
  await expect(page.getByTestId('style-left')).toHaveValue('80')
  await expect(page.getByTestId('style-top')).toHaveValue('60')
})

test('records a 500-node drag frame baseline', async ({ page }, testInfo) => {
  const largeDocument = {
    schemaVersion: '0.1.0',
    id: 'doc-large',
    name: 'Large Page',
    revision: 0,
    pages: [
      {
        id: 'page-large',
        name: 'Large',
        root: {
          id: 'large-root',
          type: 'element',
          tag: 'div',
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            padding: 8,
            width: 900,
          },
          children: Array.from({ length: 500 }, (_, index) => ({
            id: `large-item-${index}`,
            type: 'component',
            component: 'Text',
            props: { text: `Item ${index}`, as: 'span' },
            style: { width: 80, height: 28, fontSize: 12, padding: 2 },
          })),
        },
      },
    ],
  }

  const largePath = testInfo.outputPath('large.page.json')
  await writeFile(largePath, JSON.stringify(largeDocument), 'utf8')

  await page.goto('/')
  await page.getByTestId('import-input').setInputFiles(largePath)
  await expect(page.getByTestId('document-name')).toHaveText('Large Page')
  await expect(page.locator('[data-node-id="large-item-0"]')).toBeVisible()

  await page.evaluate(() => {
    const target = window as unknown as {
      __vuiFrames?: number[]
      __vuiRaf?: number
    }
    target.__vuiFrames = []
    let last = performance.now()
    const tick = (now: number): void => {
      target.__vuiFrames?.push(now - last)
      last = now
      target.__vuiRaf = requestAnimationFrame(tick)
    }
    target.__vuiRaf = requestAnimationFrame(tick)
  })

  const first = await page
    .locator('[data-node-id="large-item-0"]')
    .boundingBox()
  const fifth = await page
    .locator('[data-node-id="large-item-5"]')
    .boundingBox()
  expect(first).not.toBeNull()
  expect(fifth).not.toBeNull()

  await page.mouse.move(
    first!.x + first!.width / 2,
    first!.y + first!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(fifth!.x + fifth!.width / 2, fifth!.y + 2, {
    steps: 12,
  })
  await page.mouse.up()

  await expect(page.getByTestId('revision')).toHaveText('修订 1')

  const stats = await page.evaluate(() => {
    const target = window as unknown as {
      __vuiFrames?: number[]
      __vuiRaf?: number
    }
    if (target.__vuiRaf !== undefined) {
      cancelAnimationFrame(target.__vuiRaf)
    }
    const frames = (target.__vuiFrames ?? []).slice(1)
    const total = frames.reduce((sum, frame) => sum + frame, 0)
    return {
      count: frames.length,
      average: frames.length > 0 ? total / frames.length : 0,
    }
  })

  expect(stats.count).toBeGreaterThan(0)
  const baseline = `500 nodes, avg ${stats.average.toFixed(2)} ms over ${stats.count} frames`
  console.log(baseline)
  testInfo.annotations.push({
    type: 'drag-frame-baseline',
    description: baseline,
  })
})

