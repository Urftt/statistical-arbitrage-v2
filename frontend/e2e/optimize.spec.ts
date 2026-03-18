import { test, expect } from '@playwright/test';

/**
 * Optimize page E2E tests.
 *
 * Verifies that the tabbed optimize page renders both Grid Search
 * and Walk-Forward tabs and that switching tabs changes the visible panel.
 */

test.describe('Optimize page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/optimize');
  });

  test('optimize page loads with two tabs', async ({ page }) => {
    const tabs = page.locator('[data-optimize-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });
    await expect(tabs).toHaveCount(2);

    // Verify both tab labels
    await expect(page.locator('[data-optimize-tab="grid-search"]')).toBeVisible();
    await expect(page.locator('[data-optimize-tab="walk-forward"]')).toBeVisible();
  });

  test('switching tabs changes the visible panel', async ({ page }) => {
    // Wait for page to load
    const tabs = page.locator('[data-optimize-tab]');
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

    // Default panel is grid-search
    const gridPanel = page.locator('[data-optimize-panel="grid-search"]');
    await expect(gridPanel).toBeVisible();

    // Click Walk-Forward tab
    await page.locator('[data-optimize-tab="walk-forward"]').click();

    // Walk-Forward panel should be visible
    const wfPanel = page.locator('[data-optimize-panel="walk-forward"]');
    await expect(wfPanel).toBeVisible({ timeout: 10_000 });

    // Grid Search panel should be hidden (keepMounted=false removes it)
    await expect(gridPanel).not.toBeVisible();
  });

  test('grid search tab shows parameter controls', async ({ page }) => {
    // Wait for the grid-search panel to load
    const gridPanel = page.locator('[data-optimize-panel="grid-search"]');
    await expect(gridPanel).toBeVisible({ timeout: 10_000 });

    // Verify axis controls are present
    await expect(gridPanel.getByText('Axis 1')).toBeVisible();
    await expect(gridPanel.getByText('Axis 2')).toBeVisible();

    // Verify Run button is present
    await expect(gridPanel.getByRole('button', { name: /Run Grid Search/i })).toBeVisible();
  });
});
