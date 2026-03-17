/**
 * Typed API client for the FastAPI backend.
 *
 * Base URL defaults to http://localhost:8000, overridable via
 * NEXT_PUBLIC_API_URL environment variable.
 *
 * All functions throw on non-OK responses with descriptive messages
 * including the URL and status code for debugging.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Interfaces — match FastAPI schemas (api/schemas.py)
// ---------------------------------------------------------------------------

export interface PairInfo {
  symbol: string; // e.g. "ETH/EUR"
  base: string; // e.g. "ETH"
  quote: string; // e.g. "EUR"
  timeframe: string; // e.g. "1h"
  candles: number;
  start: string;
  end: string;
  file_size_mb: number;
}

export interface PairsListResponse {
  pairs: PairInfo[];
}

export interface OHLCVResponse {
  symbol: string;
  timeframe: string;
  count: number;
  timestamps: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface CointegrationRequest {
  asset1: string;
  asset2: string;
  timeframe: string;
  days_back?: number;
}

export interface CriticalValues {
  one_pct: number;
  five_pct: number;
  ten_pct: number;
}

export interface StationarityResult {
  name: string;
  adf_statistic: number;
  p_value: number;
  critical_values: CriticalValues;
  is_stationary: boolean;
  interpretation: string;
}

export interface SpreadProperties {
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  skewness: number;
  kurtosis: number;
  autocorr_lag1: number;
}

export interface CointegrationResponse {
  cointegration_score: number;
  p_value: number;
  critical_values: CriticalValues;
  is_cointegrated: boolean;
  hedge_ratio: number;
  intercept: number;
  spread: (number | null)[];
  zscore: (number | null)[];
  half_life: number | null;
  half_life_note: string | null;
  correlation: number;
  spread_stationarity: StationarityResult;
  spread_properties: SpreadProperties;
  interpretation: string;
  timestamps: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a symbol like "ETH/EUR" to the dash-separated format "ETH-EUR"
 * used in URL path segments.
 */
function symbolToDash(symbol: string): string {
  return symbol.replace('/', '-');
}

/**
 * Fetch wrapper with error handling and JSON parsing.
 * Logs fetch failures to console.error for observability.
 */
async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    const message = `API fetch failed: ${url} — ${err instanceof Error ? err.message : String(err)}`;
    console.error(message);
    throw new Error(message);
  }

  if (!response.ok) {
    const message = `API error: ${response.status} ${response.statusText} — ${url}`;
    console.error(message);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of all cached pairs from the backend.
 * GET /api/pairs
 */
export async function fetchPairs(): Promise<PairsListResponse> {
  return apiFetch<PairsListResponse>(`${API_BASE_URL}/api/pairs`);
}

/**
 * Fetch OHLCV candle data for a specific pair and timeframe.
 * GET /api/pairs/{symbol}/ohlcv?timeframe={tf}
 *
 * @param symbol - Pair symbol, e.g. "ETH/EUR"
 * @param timeframe - Candle timeframe, e.g. "1h"
 */
export async function fetchOHLCV(
  symbol: string,
  timeframe: string
): Promise<OHLCVResponse> {
  const dashSymbol = symbolToDash(symbol);
  return apiFetch<OHLCVResponse>(
    `${API_BASE_URL}/api/pairs/${dashSymbol}/ohlcv?timeframe=${timeframe}`
  );
}

/**
 * Run a cointegration analysis between two assets.
 * POST /api/analysis/cointegration
 */
export async function postCointegration(
  req: CointegrationRequest
): Promise<CointegrationResponse> {
  return apiFetch<CointegrationResponse>(
    `${API_BASE_URL}/api/analysis/cointegration`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }
  );
}
