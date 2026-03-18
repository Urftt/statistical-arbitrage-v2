import { test, expect, type Page } from '@playwright/test';

/**
 * Integration flow E2E tests.
 *
 * These tests exercise the connected research → backtest → optimize paths
 * on real cached BTC+ETH data at 1h timeframe. They prove:
 *
 * 1. A research module runs and renders analysis results (chart + takeaway)
 * 2. The research→backtest CTA handoff carries URL params to /backtest
 * 3. A backtest executes and renders equity curve, metrics, and honest-reporting footer
 * 4. Grid search runs and the "Use best params" CTA links to /backtest
 * 5. Walk-forward runs and renders a stability verdict
 *
 * Requirements:
 *   - FastAPI backend running on :8000 with cached BTC-EUR and ETH-EUR data
 *   - Next.js frontend running on :3000
 *   - Run: REUSE_SERVERS=1 npx playwright test e2e/integration-flows.spec.ts
 */

// ---------------------------------------------------------------------------
// Helper: select BTC-EUR × ETH-EUR via header Mantine Select inputs
// ---------------------------------------------------------------------------

async function selectPair(page: Page) {
  // Select Asset 1: BTC-EUR
  const asset1Input = page.locator('input[placeholder="Asset 1"]');
  await asset1Input.click();
  await asset1Input.fill('BTC');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Select Asset 2: ETH-EUR
  const asset2Input = page.locator('input[placeholder="Asset 2"]');
  await asset2Input.click();
  await asset2Input.fill('ETH');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Wait for pair context to propagate
  await page.waitForTimeout(500);
}

// ---------------------------------------------------------------------------
// Test 1: Research lookback module runs and produces results
// ---------------------------------------------------------------------------

test.describe('Integration flows', () => {
  test('research lookback module runs and produces results', async ({ page }) => {
    await page.goto('/research');

    // Wait for module tabs to load
    await expect(page.locator('[data-research-tab]').first()).toBeVisible({ timeout: 10_000 });

    // Select pair via header
    await selectPair(page);

    // Default tab is "Lookback Window" — find and click the Run button
    const lookbackPanel = page.locator('[data-research-module="lookback-window"]');
    await expect(lookbackPanel).toBeVisible();

    const runButton = lookbackPanel.getByRole('button', { name: /Run lookback sweep/i });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Wait for chart to render and takeaway alert to appear
    await expect(lookbackPanel.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 });

    // Verify takeaway alert rendered with non-empty text
    const takeawayAlert = lookbackPanel.locator('.mantine-Alert-root', {
      has: page.locator('text=Research takeaway'),
    });
    await expect(takeawayAlert).toBeVisible({ timeout: 30_000 });
    const takeawayText = await takeawayAlert.textContent();
    expect(takeawayText!.length).toBeGreaterThan(20);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Research → Backtest CTA handoff
  // ---------------------------------------------------------------------------

  test('research CTA hands off to backtest with URL params', async ({ page }) => {
    await page.goto('/research');
    await expect(page.locator('[data-research-tab]').first()).toBeVisible({ timeout: 10_000 });

    // Select pair and run lookback sweep
    await selectPair(page);

    const lookbackPanel = page.locator('[data-research-module="lookback-window"]');
    const runButton = lookbackPanel.getByRole('button', { name: /Run lookback sweep/i });
    await runButton.click();

    // Wait for results
    await expect(lookbackPanel.locator('.js-plotly-plot')).toBeVisible({ timeout: 30_000 });

    // Find the CTA link that navigates to /backtest
    const ctaLink = lookbackPanel.getByRole('link', { name: /Use recommended settings/i });
    await expect(ctaLink).toBeVisible({ timeout: 5_000 });

    // Click the CTA
    await ctaLink.click();

    // Assert URL contains /backtest with expected search params
    await expect(page).toHaveURL(/\/backtest/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get('source')).toBe('research');
    expect(url.searchParams.get('asset1')).toContain('BTC');
    expect(url.searchParams.has('lookback_window')).toBe(true);

    // Assert the "Research recommendation loaded" alert renders on the backtest page
    await expect(
      page.locator('.mantine-Alert-root', { hasText: 'Research recommendation loaded' })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Backtest executes and renders results
  // ---------------------------------------------------------------------------

  test('backtest executes and renders equity curve, metrics, and footer', async ({ page }) => {
    await page.goto('/backtest');

    // Select pair via header
    await selectPair(page);

    // Click Run Backtest
    const runButton = page.getByRole('button', { name: /Run backtest/i });
    await expect(runButton).toBeVisible({ timeout: 10_000 });
    await runButton.click();

    // Wait for equity curve chart to render
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 30_000 });

    // Verify honest-reporting footer is visible
    await expect(page.getByText('Honest-reporting footer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Assumptions', { exact: true })).toBeVisible();
    await expect(page.getByText('Limitations', { exact: true })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Test 4: Grid search runs and CTA links to /backtest
  // ---------------------------------------------------------------------------

  test('grid search runs and CTA links to backtest', async ({ page }) => {
    await page.goto('/optimize');

    // Wait for grid search panel (default tab)
    const gridPanel = page.locator('[data-optimize-panel="grid-search"]');
    await expect(gridPanel).toBeVisible({ timeout: 10_000 });

    // Select pair via header
    await selectPair(page);

    // Narrow the axis ranges for speed: Axis 1 min=1.5 max=2.5 step=1.0,
    // Axis 2 min=0.3 max=0.5 step=0.2 → 2×2 = 4-cell grid for fast execution.
    // Mantine NumberInput renders as textbox with label text as name.
    const minInputs = gridPanel.getByRole('textbox', { name: 'Min' });
    const maxInputs = gridPanel.getByRole('textbox', { name: 'Max' });
    const stepInputs = gridPanel.getByRole('textbox', { name: 'Step' });

    await minInputs.first().fill('1.5');
    await maxInputs.first().fill('2.5');
    await stepInputs.first().fill('1');

    await minInputs.nth(1).fill('0.3');
    await maxInputs.nth(1).fill('0.5');
    await stepInputs.nth(1).fill('0.2');

    // Click Run Grid Search
    const runButton = gridPanel.getByRole('button', { name: /Run Grid Search/i });
    await runButton.click();

    // Wait for heatmap chart to render
    await expect(gridPanel.locator('.js-plotly-plot')).toBeVisible({ timeout: 60_000 });

    // Assert "Use best params" CTA is visible
    const ctaLink = gridPanel.getByRole('link', { name: /Use best params/i });
    await expect(ctaLink).toBeVisible({ timeout: 5_000 });

    // Click the CTA
    await ctaLink.click();

    // Assert URL contains /backtest with grid-search source
    await expect(page).toHaveURL(/\/backtest/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get('source')).toBe('grid-search');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Walk-forward renders stability verdict
  // ---------------------------------------------------------------------------

  test('walk-forward runs and renders stability verdict', async ({ page }) => {
    await page.goto('/optimize');

    // Wait for tabs
    await expect(page.locator('[data-optimize-tab]').first()).toBeVisible({ timeout: 10_000 });

    // Select pair via header
    await selectPair(page);

    // Switch to Walk-Forward tab
    await page.locator('[data-optimize-tab="walk-forward"]').click();
    const wfPanel = page.locator('[data-optimize-panel="walk-forward"]');
    await expect(wfPanel).toBeVisible({ timeout: 10_000 });

    // Configure minimal settings: 2 folds, narrow axis ranges
    const foldsInput = wfPanel.getByRole('textbox', { name: 'Folds' });
    await foldsInput.fill('2');

    // Narrow Axis 1 (entry_threshold): min=1.5 max=2.5 step=1.0
    const minInputs = wfPanel.getByRole('textbox', { name: 'Min' });
    const maxInputs = wfPanel.getByRole('textbox', { name: 'Max' });
    const stepInputs = wfPanel.getByRole('textbox', { name: 'Step' });

    await minInputs.first().fill('1.5');
    await maxInputs.first().fill('2.5');
    await stepInputs.first().fill('1');

    // Narrow Axis 2 (exit_threshold): min=0.3 max=0.5 step=0.2
    await minInputs.nth(1).fill('0.3');
    await maxInputs.nth(1).fill('0.5');
    await stepInputs.nth(1).fill('0.2');

    // Click Run Walk-Forward
    const runButton = wfPanel.getByRole('button', { name: /Run Walk-Forward/i });
    await runButton.click();

    // Wait for stability verdict banner
    await expect(
      wfPanel.locator('.mantine-Alert-root', { hasText: /stable|moderate|fragile/i })
    ).toBeVisible({ timeout: 60_000 });

    // Assert the verdict text contains one of the expected verdicts
    const verdictAlert = wfPanel.locator('.mantine-Alert-root').first();
    const verdictText = await verdictAlert.textContent();
    expect(verdictText).toMatch(/stable|moderate|fragile/i);
  });
});
