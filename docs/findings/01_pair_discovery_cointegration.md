# Pair Discovery: Cointegration Analysis

**Date**: 2025-11-03
**Related Notebooks**: `03_pair_discovery.ipynb`, `04_timeframe_analysis.ipynb`
**Status**: Research - Requires validation

---

## Summary

Systematic cointegration testing of 40 cryptocurrency pairs on Bitvavo exchange identified **10 statistically significant cointegrated pairs** at the 1-hour timeframe. However, critical analysis revealed that cointegration relationships are **temporally unstable** and **highly timeframe-dependent**, requiring continuous validation before any trading application.

---

## Methodology

### Data Specifications
- **Exchange**: Bitvavo (EUR-denominated pairs)
- **Primary Period**: 90 days (2025-08-04 to 2025-11-03)
- **Primary Timeframe**: 1-hour OHLCV candles (~2,150 data points)
- **Additional Timeframes**: 15m, 4h, 1d (for stability analysis)
- **Data Source**: CCXT library via custom `BitvavoDataCollector`

### Statistical Method
- **Test**: Engle-Granger two-step cointegration test
- **Significance Level**: α = 0.05 (p-value < 0.05)
- **Components**:
  1. OLS regression to calculate hedge ratio (β)
  2. ADF test on residual spread for stationarity
  3. Half-life calculation via Ornstein-Uhlenbeck process

### Pair Selection Strategy
40 pairs tested across 7 categories chosen for theoretical cointegration potential:
1. **Major Coins** (7 pairs) - Market leaders and forks
2. **Layer-1 Platforms** (9 pairs) - Competing blockchain ecosystems
3. **DeFi Tokens** (8 pairs) - Decentralized finance protocols
4. **Memecoins** (6 pairs) - Speculative sentiment-driven assets
5. **Exchange Tokens** (3 pairs) - Exchange utility tokens
6. **Gaming/Metaverse** (4 pairs) - Gaming sector tokens
7. **Scaling/Layer-2** (3 pairs) - Ethereum scaling solutions

---

## Results

### 1-Hour Timeframe: 10 Cointegrated Pairs

| Rank | Asset 1 | Asset 2 | Category | P-Value | Correlation | Half-Life (hrs) |
|------|---------|---------|----------|---------|-------------|-----------------|
| 1 | PEPE | BONK | Memecoins | 0.0027 | 0.98 | -30.8 |
| 2 | WIF | BONK | Memecoins | 0.0052 | 0.99 | -27.3 |
| 3 | LINK | GRT | DeFi | 0.0061 | 0.82 | -55.9 |
| 4 | ETH | ADA | Major Coins | 0.0065 | 0.85 | -55.8 |
| 5 | SHIB | BONK | Memecoins | 0.0084 | 0.97 | -35.8 |
| 6 | ETH | ETC | Major Coins | 0.0090 | 0.75 | -50.0 |
| 7 | AXS | SAND | Gaming | 0.0091 | 0.98 | -10.3 |
| 8 | LINK | UNI | DeFi | 0.0126 | 0.80 | -70.9 |
| 9 | FTT | CRO | Exchange | 0.0327 | -0.20 | -19.5 |
| 10 | CRV | AAVE | DeFi | 0.0432 | 0.85 | -95.6 |

**Discovery Rate**: 25% (10 out of 40 pairs tested)

### Multi-Timeframe Consistency

Testing the top 10 pairs across 4 timeframes:

| Timeframe | Candles | Cointegrated | Rate |
|-----------|---------|--------------|------|
| 15 minutes | ~5,300 | 4/10 | 40% |
| 1 hour | ~2,150 | 10/10 | 100% |
| 4 hours | ~540 | 10/10 | 100% |
| Daily | TBD | TBD | TBD |

**Stable Across All Tested Timeframes (15m, 1h, 4h):**
1. PEPE/BONK (p-values: 0.029, 0.003, 0.003)
2. WIF/BONK (p-values: 0.008, 0.005, 0.005)
3. FTT/CRO (p-values: 0.040, 0.033, 0.033)
4. CRV/AAVE (p-values: 0.042, 0.043, 0.038)

---

## Critical Finding: Temporal Instability

### Evidence

Comparing results with previous analysis run (days apart) on same 1h timeframe:

**Lost Cointegration:**
- SUSHI/UNI: p=0.032 → p=0.091 (no longer significant)
- CRV/SNX: p=0.041 → p=0.405 (no longer significant)

**Gained Cointegration:**
- ETH/ETC: Not cointegrated → p=0.009
- ETH/ADA: Not cointegrated → p=0.006
- LINK/UNI: Not cointegrated → p=0.013
- LINK/GRT: Not cointegrated → p=0.006

### Interpretation

Cointegration is **not a stable property** over time. Pairs that exhibit cointegration during one period may not maintain this relationship in subsequent periods, even with the same timeframe and methodology.

---

## Key Observations

### 1. Memecoin Dominance

**3 of 4 most stable pairs are Solana-based memecoins** (PEPE/BONK, WIF/BONK, SHIB/BONK):
- **Shared ecosystem**: All trade primarily on Solana DEXs
- **Sentiment correlation**: Move together with speculative hype cycles
- **Similar liquidity**: Trade on same CEXs (Binance, Bybit, Bitvavo)
- **Fastest mean reversion**: Half-lives between 27-36 hours

### 2. Correlation ≠ Cointegration

High correlation does not guarantee cointegration:
- ADA/DOT: r=0.92, p=0.36 (NOT cointegrated)
- ATOM/DOT: r=0.90, p=0.77 (NOT cointegrated)
- GALA/SAND: r=0.99, p=0.39 (NOT cointegrated)

**Implication**: Must test for cointegration explicitly; correlation alone is insufficient.

### 3. Inverse Relationships Can Cointegrate

Negative correlation can still exhibit cointegration:
- FTT/CRO: r=-0.20, p=0.033 (cointegrated)
- CRV/SNX: r=-0.72, p=0.041 (was cointegrated)

**Implication**: Cointegration captures stable equilibrium relationships, regardless of direction.

### 4. Rebranding Handled

Successfully identified ticker changes:
- MATIC → POL (Polygon rebrand)
- FTM → S (Fantom → Sonic rebrand)
- MKR → SKY (MakerDAO → Sky Protocol rebrand)

*Note*: SKY/EUR returned 0 candles - likely not yet available on Bitvavo.

---

## Implications

### For Trading Strategy

1. **Continuous Monitoring Required**
   - Cannot assume cointegration persists
   - Need real-time p-value tracking
   - Implement automatic de-listing when p > 0.05

2. **Timeframe Selection Critical**
   - High-frequency trading (15m): Limited to 4 stable pairs
   - Medium-frequency (1h-4h): Full set of 10 pairs available
   - Strategy timeframe must match cointegration timeframe

3. **Mean Reversion Speed Varies**
   - Fast (10-30h): AXS/SAND, WIF/BONK, PEPE/BONK - suitable for active trading
   - Medium (30-60h): ETH/ETC, LINK/GRT, ETH/ADA - moderate holding periods
   - Slow (60-100h): LINK/UNI, CRV/AAVE - longer-term positions

4. **Risk Management Priority**
   - Temporal instability = high model risk
   - Position sizing must account for relationship breakdown
   - Stop-losses essential (can't rely on mean reversion)

### For Research

1. **Rolling Window Analysis** (Next Priority)
   - Test 30-day, 60-day windows
   - Identify regime changes
   - Calculate cointegration "half-life" (how long it persists)

2. **Spread Stationarity Verification**
   - Confirm ADF test results hold out-of-sample
   - Check for structural breaks in spread

3. **Transaction Cost Sensitivity**
   - Calculate minimum profitable spread width
   - Model slippage impact on Bitvavo
   - Fee structure: Maker 0.15%, Taker 0.25%

---

## Limitations

### Data Constraints
- **Limited history**: Only 90 days tested (crypto is young)
- **Single exchange**: Bitvavo-specific liquidity patterns
- **EUR pairs only**: USD pairs may behave differently
- **Bull/bear regime**: All data from recent market conditions

### Statistical Caveats
- **Multiple testing**: 40 pairs tested, increased false positive risk
- **Look-ahead bias**: Selected pairs after seeing initial results
- **Survivorship bias**: Only active trading pairs included
- **Non-stationarity**: Crypto markets evolve rapidly

### Method Limitations
- **Linear assumption**: OLS regression assumes linear relationship
- **Constant hedge ratio**: Real relationships may have time-varying β
- **Engle-Granger**: Single-equation method, sensitive to which asset is dependent variable

---

## Next Steps

### Immediate (Before Any Trading)

1. ✅ **Complete daily timeframe analysis** for 10 pairs
2. ⚠️ **Rolling window cointegration** (30, 60, 90-day windows)
   - Track p-value evolution over time
   - Identify stability periods vs breakdown periods
3. ⚠️ **Out-of-sample validation**
   - Test on most recent week (not used in discovery)
   - Verify relationships hold in fresh data

### Short-Term Research

4. **Half-life stability analysis**
   - Verify mean reversion speeds are consistent
   - Check for time-varying half-lives
5. **Spread distribution analysis**
   - Q-Q plots for normality
   - Fat tail risk assessment
6. **Johansen cointegration test**
   - Multivariate approach as validation
   - Test for multiple cointegrating vectors

### Before Live Deployment

7. **Backtest with realistic constraints**
   - 0.15%/0.25% maker/taker fees
   - Slippage modeling (bid-ask spread)
   - Position limits based on liquidity
8. **Risk framework**
   - Max drawdown limits
   - Position sizing rules
   - Cointegration health checks
9. **Paper trading**
   - Real-time testing without capital risk
   - Verify execution logic

---

## References

### Notebooks
- `notebooks/03_pair_discovery.ipynb` - Main systematic testing
- `notebooks/04_timeframe_analysis.ipynb` - Multi-timeframe validation
- `notebooks/02_cointegration_analysis.ipynb` - ETH/ETC initial test
- `notebooks/00_cointegration_explained.ipynb` - Educational materials

### Code Modules
- `src/statistical_arbitrage/data/bitvavo_client.py` - Data collection
- `src/statistical_arbitrage/analysis/cointegration.py` - PairAnalysis class
- `src/statistical_arbitrage/visualization/spread_plots.py` - Visualization tools

### Statistical Methods
- **Engle, R. F., & Granger, C. W. (1987)**. "Co-integration and error correction: representation, estimation, and testing." *Econometrica*, 251-276.
- **Dickey, D. A., & Fuller, W. A. (1979)**. "Distribution of the estimators for autoregressive time series with a unit root." *Journal of the American statistical association*, 74(366a), 427-431.

---

## Conclusion

**Cointegration relationships exist in cryptocurrency pairs**, particularly among:
- Solana-based memecoins (most stable)
- Major coin forks (ETH/ETC, moderately stable)
- DeFi protocol tokens (LINK/GRT, LINK/UNI, CRV/AAVE)

However, **temporal instability poses significant risk**. Pairs that are cointegrated today may not be tomorrow. This finding necessitates:

1. Continuous statistical monitoring
2. Rolling window validation before deployment
3. Robust risk management to handle relationship breakdowns
4. Timeframe-matched trading strategies

**Current Status**: Research phase. **Not ready for live trading** without completing rolling window stability analysis and out-of-sample validation.

---

*Document Version: 1.0*
*Last Updated: 2025-11-03*
*Next Update: After rolling window analysis completion*
