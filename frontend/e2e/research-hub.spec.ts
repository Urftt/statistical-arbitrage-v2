import { test, expect } from '@playwright/test';

/**
 * Research Hub E2E tests.
 *
 * Verifies that the tabbed module picker renders all 8 module tabs
 * and that switching tabs changes the visible panel content.
 *
 * Does NOT run actual analysis (requires committed pair selection
 * which is fragile in automation — see KNOWLEDGE.md).
 */

test.describe('Research Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/research');
  });

  test('renders at least 4 module tab labels', async ({ page }) => {
    // Each tab has a data-research-tab attribute
    const tabs = page.locator('[data-research-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('renders all 8 module tabs', async ({ page }) => {
    const tabs = page.locator('[data-research-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });
    await expect(tabs).toHaveCount(8);
  });

  test('clicking a different tab changes the visible panel', async ({ page }) => {
    // Wait for tabs to be visible
    const tabs = page.locator('[data-research-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    // The default panel is lookback-window
    const lookbackPanel = page.locator('[data-research-module="lookback-window"]');
    await expect(lookbackPanel).toBeVisible();

    // Click the "Spread Method" tab
    await page.locator('[data-research-tab="spread-method"]').click();

    // The spread method panel should be visible
    const spreadPanel = page.locator('[data-research-module="spread-method"]');
    await expect(spreadPanel).toBeVisible({ timeout: 10_000 });

    // The lookback panel should be hidden
    await expect(lookbackPanel).not.toBeVisible();

    // Verify the spread method panel contains expected text
    await expect(spreadPanel.getByText(/Spread Method Comparison/i)).toBeVisible();
  });

  test('switching to multiple tabs works', async ({ page }) => {
    const tabs = page.locator('[data-research-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    // Click through several tabs and verify panel switches
    for (const [tabId, expectedText] of [
      ['rolling-stability', 'Rolling Cointegration Stability'],
      ['oos-validation', 'Out-of-Sample Validation'],
      ['coint-method', 'Cointegration Method Comparison'],
      ['tx-cost', 'Transaction Cost Impact'],
    ] as const) {
      await page.locator(`[data-research-tab="${tabId}"]`).click();
      const panel = page.locator(`[data-research-module="${tabId}"]`);
      await expect(panel).toBeVisible({ timeout: 10_000 });
      await expect(panel.getByText(expectedText)).toBeVisible();
    }
  });
});
