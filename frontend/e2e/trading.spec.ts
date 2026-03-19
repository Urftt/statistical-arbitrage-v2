import { test, expect, type Locator, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:8000';

/**
 * E2E tests for the /trading page.
 *
 * Tests run against the full stack (FastAPI + Next.js).
 * Each test cleans up sessions it creates to stay independent.
 */

/** Helper: create a session via the API and return its session_id. */
async function createSessionViaAPI(opts: {
  asset1?: string;
  asset2?: string;
  timeframe?: string;
  is_live?: boolean;
} = {}): Promise<string> {
  const res = await fetch(`${API_BASE}/api/trading/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset1: opts.asset1 ?? 'BTC',
      asset2: opts.asset2 ?? 'ETH',
      timeframe: opts.timeframe ?? '1h',
      is_live: opts.is_live ?? false,
    }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  const data = await res.json();
  return data.session_id;
}

/** Helper: delete a session via the API (ignores 404). */
async function deleteSessionViaAPI(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/api/trading/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

/** Helper: list all sessions and delete them all. */
async function deleteAllSessions(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/trading/sessions`);
  if (!res.ok) return;
  const data = await res.json();
  for (const session of data.sessions) {
    await deleteSessionViaAPI(session.session_id);
  }
}

/**
 * Helper: fill a Mantine Select inside a scoped container.
 * Types the value, presses ArrowDown + Enter to commit the selection.
 */
async function fillMantineSelect(
  container: Locator,
  label: string,
  value: string
): Promise<void> {
  const input = container.getByRole('textbox', { name: label });
  await input.click();
  await input.fill(value);
  await input.press('ArrowDown');
  await input.press('Enter');
}

test.describe('Trading Page', () => {
  // Clean slate before each test
  test.beforeEach(async () => {
    await deleteAllSessions();
  });

  // Clean up after each test too
  test.afterEach(async () => {
    await deleteAllSessions();
  });

  test('shows empty session list on initial load', async ({ page }) => {
    await page.goto('/trading');

    // Page heading is visible
    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();

    // Empty state message
    await expect(
      page.getByText('No trading sessions yet. Create one above.')
    ).toBeVisible();
  });

  test('create a paper session and verify paper badge', async ({ page }) => {
    await page.goto('/trading');
    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();

    // Scope to the Create Session form to avoid header pair selector conflicts
    const formSection = page
      .getByRole('heading', { name: 'Create Session' })
      .locator('..');

    // Fill Asset 1
    await fillMantineSelect(formSection, 'Asset 1', 'BTC');

    // Fill Asset 2
    await fillMantineSelect(formSection, 'Asset 2', 'ETH');

    // Timeframe defaults to 1h, Paper mode is default — no toggling needed

    // Submit the form
    await page.getByRole('button', { name: /Create Paper Session/i }).click();

    // Wait for the session to appear in the list
    await expect(page.getByText('BTC/ETH')).toBeVisible({ timeout: 10_000 });

    // Verify paper badge — scope to table to avoid matching sidebar/button text
    const table = page.getByRole('table');
    await expect(table.getByText('Paper', { exact: true })).toBeVisible();

    // Verify status is "created" — use exact to avoid matching "Created" column header
    await expect(table.getByText('created', { exact: true })).toBeVisible();
  });

  test('create a live session and verify live badge', async ({ page }) => {
    await page.goto('/trading');
    await expect(page.getByRole('heading', { name: 'Trading' })).toBeVisible();

    // Scope to the Create Session form
    const formSection = page
      .getByRole('heading', { name: 'Create Session' })
      .locator('..');

    // Fill Asset 1
    await fillMantineSelect(formSection, 'Asset 1', 'SOL');

    // Fill Asset 2
    await fillMantineSelect(formSection, 'Asset 2', 'AVAX');

    // Toggle live mode ON — Mantine Switch renders with role="switch"
    await page.getByRole('switch').click();

    // The warning alert should appear
    await expect(page.getByText('Live Trading Warning')).toBeVisible();

    // Submit the form — button should say "Create Live Session"
    await page.getByRole('button', { name: /Create Live Session/i }).click();

    // Wait for the session to appear
    await expect(page.getByText('SOL/AVAX')).toBeVisible({ timeout: 10_000 });

    // Verify live badge — scope to table
    const table = page.getByRole('table');
    await expect(table.getByText('Live', { exact: true })).toBeVisible();
  });

  test('kill switch button and confirmation modal for live session', async ({
    page,
  }) => {
    // Create a live session via API for speed
    await createSessionViaAPI({
      asset1: 'BTC',
      asset2: 'ETH',
      is_live: true,
    });

    await page.goto('/trading');

    // Wait for the session to load
    await expect(page.getByText('BTC/ETH')).toBeVisible({ timeout: 10_000 });

    // Kill button should be visible (only on live sessions)
    const killButton = page.getByLabel('Kill session');
    await expect(killButton).toBeVisible();

    // Click kill — modal should open
    await killButton.click();

    // Verify confirmation modal
    await expect(page.getByText('Kill Switch — Confirm')).toBeVisible();
    await expect(
      page.getByText('This will immediately close all positions via market orders.')
    ).toBeVisible();
    await expect(
      page.getByText('This action cannot be undone.', { exact: true })
    ).toBeVisible();

    // Click Cancel — modal should close
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Kill Switch — Confirm')).not.toBeVisible();

    // Click kill again, then confirm
    await killButton.click();
    await expect(page.getByText('Kill Switch — Confirm')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Kill' }).click();

    // Wait for status to update to "killed" — use exact match scoped to table
    const table = page.getByRole('table');
    await expect(table.getByText('killed', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('delete a session removes it from the list', async ({ page }) => {
    // Create a paper session via API
    await createSessionViaAPI({
      asset1: 'ALGO',
      asset2: 'ADA',
    });

    await page.goto('/trading');

    // Wait for the session to appear
    await expect(page.getByText('ALGO/ADA')).toBeVisible({ timeout: 10_000 });

    // Click the delete button
    const deleteButton = page.getByLabel('Delete session');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Session should disappear, empty state should return
    await expect(page.getByText('ALGO/ADA')).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText('No trading sessions yet. Create one above.')
    ).toBeVisible();
  });

  test('session lifecycle: start and stop', async ({ page }) => {
    // Create a paper session via API
    await createSessionViaAPI({
      asset1: 'DOT',
      asset2: 'LINK',
    });

    await page.goto('/trading');

    // Wait for session to appear
    await expect(page.getByText('DOT/LINK')).toBeVisible({ timeout: 10_000 });

    // Verify initial status is "created" — exact match scoped to table
    const table = page.getByRole('table');
    await expect(table.getByText('created', { exact: true })).toBeVisible();

    // Click start
    const startButton = page.getByLabel('Start session');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Status should change to "running"
    await expect(table.getByText('running', { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Click stop
    const stopButton = page.getByLabel('Stop session');
    await expect(stopButton).toBeVisible();
    await stopButton.click();

    // Status should change to "stopped"
    await expect(table.getByText('stopped', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('kill switch button is NOT visible for paper sessions', async ({
    page,
  }) => {
    // Create a paper session via API
    await createSessionViaAPI({
      asset1: 'XRP',
      asset2: 'XLM',
      is_live: false,
    });

    await page.goto('/trading');

    // Wait for session to appear
    await expect(page.getByText('XRP/XLM')).toBeVisible({ timeout: 10_000 });

    // Verify Paper badge — scope to table
    const table = page.getByRole('table');
    await expect(table.getByText('Paper', { exact: true })).toBeVisible();

    // Kill button should NOT be present for paper sessions
    await expect(page.getByLabel('Kill session')).not.toBeVisible();

    // But start and delete should be visible
    await expect(page.getByLabel('Start session')).toBeVisible();
    await expect(page.getByLabel('Delete session')).toBeVisible();
  });
});
