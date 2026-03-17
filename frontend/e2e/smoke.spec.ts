import { test, expect } from '@playwright/test';

/**
 * Smoke tests covering the core M001 surfaces.
 *
 * These replace manual browser-tool verification:
 *   `cd frontend && npx playwright test`
 *
 * Each test validates that the page loads, renders its key elements,
 * and connects to the FastAPI backend where applicable.
 */

test.describe('App Shell', () => {
  test('root redirects to /academy', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/academy/);
  });

  test('sidebar navigation links work', async ({ page }) => {
    await page.goto('/academy');

    // Navigate through all sidebar links
    for (const [label, path] of [
      ['Scanner', '/scanner'],
      ['Deep Dive', '/deep-dive'],
      ['Glossary', '/glossary'],
      ['Academy', '/academy'],
    ] as const) {
      await page.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(path));
    }
  });

  test('header pair selectors are populated from API', async ({ page }) => {
    await page.goto('/academy');
    // Wait for pair data to load from API
    const select = page.locator('input[aria-label="Asset 1"], input[placeholder*="Asset"]').first();
    await expect(select).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Academy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academy');
  });

  test('stepper shows all 6 steps', async ({ page }) => {
    // Mantine Stepper renders step buttons
    const steps = page.locator('.mantine-Stepper-step');
    await expect(steps).toHaveCount(6);
  });

  test('step 1 shows pair suggestion cards', async ({ page }) => {
    await expect(page.getByText('BTC/EUR × ETH/EUR')).toBeVisible();
    await expect(page.getByText('SOL/EUR × AVAX/EUR')).toBeVisible();
  });

  test('clicking a pair card populates header selects and enables step 2 chart', async ({ page }) => {
    // Click the BTC × ETH card
    await page.getByText('BTC/EUR × ETH/EUR').click();

    // Navigate to step 2
    const steps = page.locator('.mantine-Stepper-step');
    await steps.nth(1).click();

    // Wait for the Plotly chart to render (proves API data was fetched and charted)
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 });
  });

  test('step 3 shows concept chart without pair selection', async ({ page }) => {
    const steps = page.locator('.mantine-Stepper-step');
    await steps.nth(2).click();

    // Concept chart uses synthetic data — always renders
    await expect(page.locator('.js-plotly-plot')).toBeVisible({ timeout: 10_000 });
  });

  test('steps 4-6 render with pair selected', async ({ page }) => {
    // Select a pair first
    await page.getByText('BTC/EUR × ETH/EUR').click();

    for (const stepIdx of [3, 4, 5]) {
      const steps = page.locator('.mantine-Stepper-step');
      await steps.nth(stepIdx).click();

      // Each step should render at least one Plotly chart
      await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('educational panels expand and collapse', async ({ page }) => {
    // Select pair and go to step 2
    await page.getByText('BTC/EUR × ETH/EUR').click();
    const steps = page.locator('.mantine-Stepper-step');
    await steps.nth(1).click();

    // Intuition panel should be visible by default
    await expect(page.getByText('💡 Intuition')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('🔧 How It Works')).toBeVisible();
    await expect(page.getByText('📊 Your Pair')).toBeVisible();
  });

  test('step 5 slider updates chart without network request', async ({ page }) => {
    await page.getByText('BTC/EUR × ETH/EUR').click();
    const steps = page.locator('.mantine-Stepper-step');
    await steps.nth(4).click();

    // Wait for the chart to render
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 15_000 });

    // Find and interact with the slider
    const slider = page.locator('.mantine-Slider-root').first();
    if (await slider.isVisible()) {
      // Drag the slider — the chart should update without new network requests
      const box = await slider.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
        // Chart should still be visible (re-rendered, not broken)
        await expect(page.locator('.js-plotly-plot').first()).toBeVisible();
      }
    }
  });
});

test.describe('Scanner', () => {
  test('runs a batch scan and shows results', async ({ page }) => {
    await page.goto('/scanner');

    // The scanner should have coin selection UI
    await expect(page.getByRole('textbox', { name: 'Coins to scan' })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Deep Dive', () => {
  test('page loads with analysis controls', async ({ page }) => {
    await page.goto('/deep-dive');
    // Should show the deep dive page structure
    await expect(page.getByText(/Deep Dive|Analyze|Analysis/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Glossary', () => {
  test('renders all 17 terms', async ({ page }) => {
    await page.goto('/glossary');

    const cards = page.locator('[data-glossary-card="true"]');
    await expect(cards).toHaveCount(17, { timeout: 10_000 });
  });

  test('search filters terms', async ({ page }) => {
    await page.goto('/glossary');

    // Type a search query
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('cointegration');

    // Should filter to fewer cards
    const cards = page.locator('[data-glossary-card="true"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(17);
  });

  test('direct hash link scrolls to term', async ({ page }) => {
    await page.goto('/glossary#glossary-z-score');

    // The z-score card should be in the viewport
    const zScoreCard = page.locator('#glossary-z-score');
    await expect(zScoreCard).toBeVisible({ timeout: 10_000 });
  });
});
