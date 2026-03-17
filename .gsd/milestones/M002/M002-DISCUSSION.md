# M002 Discussion Log

## Exchange — 2026-03-17T19:00:47.359Z

### M002 Scope

M002 has two big chunks: (1) porting the 8 research modules to the React frontend, and (2) building the entire backtesting engine from scratch. That's a lot of surface area. How do you see the relationship between these two — is the backtester the main event and research modules are supporting cast, or are they equally important?

- **Backtester is the star** — Research modules support it — the goal is to go from hypothesis to backtest result
- **Equally important** — Research modules stand alone for learning; backtester is a separate tool
- **Research first** — Research modules are the priority; backtester comes after and builds on them

**Selected:** Equally important
**Notes:** The way I see it. This project has three main modules: the academy, reseach & backtesting, paper trading & live trading. So the academy is about learning about statistical arbitrage in general, and the research & backtesting is all about finding right parameters manually and automated and then backtesting the results so profit but also the costs. And the paper and live trading speaks for itself i believe

### Engine Design

For the backtesting engine: vectorized (compute all signals at once from arrays, fast but rigid) vs event-driven (step through time bar-by-bar, slower but models real execution and prevents look-ahead bias by construction). I'd lean vectorized with strict rolling-window discipline — it's simpler, faster, and look-ahead prevention can be enforced by only passing historical slices. Event-driven is overkill unless you plan complex order types or multi-strategy orchestration.

- **Vectorized (Recommended)** — Fast, simple, sufficient for z-score mean-reversion. Enforce look-ahead via rolling windows.
- **Event-driven** — Bar-by-bar simulation. More realistic but heavier. Better for complex strategies later.
- **Let me explain** — I have a different take on this.

**Selected:** Vectorized (Recommended)

---
## Exchange — 2026-03-17T19:07:58.182Z

### Backtest Feel

When you run a backtest, what should the experience look like? I'm picturing: pick a pair, set parameters (or use research-recommended ones), hit Run, and get an equity curve, trade log, metrics cards (Sharpe, drawdown, etc.), and honest-reporting warnings — all on one page. Or do you see it more as a comparison tool where you're always looking at multiple runs side by side?

- **Results dashboard (Recommended)** — Run backtest → see equity curve, trade list, metrics, and honest warnings all at once
- **Comparison-first** — More emphasis on comparing parameter sets side-by-side than single runs

**Selected:** Results dashboard (Recommended)

### Research → Backtest

How tightly should research and backtesting be connected? I could see a flow where research modules surface parameter recommendations (e.g., 'z-score threshold of 1.8 showed best risk-adjusted returns'), and you can click a button to backtest those exact parameters. Or should they stay more independent — research for exploration, backtester for validation?

- **Connected flow (Recommended)** — Research suggests parameters, one click pre-fills them in the backtester
- **Separate tools** — Keep them separate — research is exploration, backtester is validation
- **Let me explain** — Something else in mind

**Selected:** Connected flow (Recommended)

### Done Criteria

What does 'done' look like for M002 concretely? When would you feel confident moving to M003 (paper trading)?

- **Full research-to-backtest loop** — I can do a full loop: research a pair → find good parameters → backtest them → trust the result
- **Full loop + advanced validation** — Plus walk-forward and overfitting checks must be working, not just basic backtest
- **Let me explain** — Different bar for 'done'

**Selected:** Full research-to-backtest loop

---
## Exchange — 2026-03-17T19:16:23.077Z

### Overfitting UX

Overfitting detection (R012) — when a backtest result looks suspiciously good (Sharpe > 3, profit factor > 5 with few trades), how should warnings appear? I'd lean toward colored warning banners directly on the results page, same visual language as the research takeaway banners you already have. A Sharpe of 4.2 gets a red banner saying 'This Sharpe ratio is unusually high — likely overfitted. Consider testing on out-of-sample data.' Keeps it honest without a separate screen.

- **Inline warnings (Recommended)** — Colored warning banners on the results page, similar to research takeaway banners
- **Dedicated health section** — A dedicated 'Health Check' section that grades overall trustworthiness of the result
- **Let me explain** — Different approach

**Selected:** Inline warnings (Recommended)

### Multi-Param

Multi-parameter optimization (R011): the existing research modules sweep one parameter at a time. Should M002 add multi-parameter grid search (e.g., sweep entry threshold × lookback window simultaneously)? I'd suggest a bounded grid search — 2-3 parameters, heatmap visualization, with automatic flagging when the 'optimal' point is surrounded by poor results (classic overfitting signal). Bayesian optimization adds complexity with marginal benefit at this scale.

- **Grid search + heatmap (Recommended)** — Grid search across 2-3 parameters with a heatmap visualization of the results
- **Single sweeps only** — Just single-parameter sweeps from research modules are enough for M002
- **Let me explain** — I have thoughts

**Selected:** Grid search + heatmap (Recommended)

### Walk-Forward

Walk-forward testing (R014) is the gold standard for realistic backtesting, but it's also the most complex piece. Should it be a hard requirement for M002, or is a basic in-sample/out-of-sample validation sufficient to feel confident moving to paper trading? The existing OOS validation research module is already a stepping stone.

- **Must-have** — Yes, walk-forward is a must-have for M002 — it's what makes results trustworthy
- **Nice-to-have (Recommended)** — Nice to have in M002, but basic in-sample/out-of-sample split is enough to move to M003
- **Let me explain** — Different priority level

**Selected:** Must-have

---
## Exchange — 2026-03-17T19:19:26.331Z

### Data Quality

Data quality validation (R023) before backtesting — should it be a hard gate (backtest won't run if data has gaps > X candles) or advisory (shows warnings but lets you proceed)? I'd lean toward a pre-flight check: run before every backtest, block on critical issues (like 20% missing data), warn on minor ones (a few missing candles that get interpolated).

- **Pre-flight check (Recommended)** — Run validation before every backtest, block if critical issues found, warn on minor ones
- **Advisory only** — Just surface a data quality summary — let the user decide whether to proceed
- **Let me explain** — Different approach

**Selected:** Pre-flight check (Recommended)

### Result Format

Should research module results and backtest results share a common format? This would let you compare a research finding ('z-score 1.8 gave 42 trades') directly against a backtest result ('z-score 1.8 yielded 1.3 Sharpe') in the same UI. I'd lean yes — a shared 'result envelope' with metadata (pair, timeframe, parameters, timestamp, warnings) that both research and backtest results inherit from.

- **Shared format (Recommended)** — Yes — same Pydantic model structure so they can be compared and composed
- **Separate formats** — Keep them separate — research results and backtest results serve different purposes

**Selected:** Shared format (Recommended)

### Honest Report

R015 (honest reporting) — concretely, what does 'always show assumptions and limitations' look like? I'm thinking every backtest and research result gets a metadata footer: sample size, date range, fees assumed, slippage model, and a confidence qualifier ('High confidence: 500+ trades over 2 years' vs 'Low confidence: 12 trades over 3 months'). What level of transparency feels right without being overwhelming?

- **Metadata footer (Recommended)** — Every result shows: sample size, date range, assumptions, and a confidence qualifier
- **Metadata + expandable section** — Plus a dedicated 'Assumptions & Limitations' expandable section per result
- **Let me explain** — Different idea

**Selected:** Metadata footer (Recommended)

---
## Exchange — 2026-03-17T19:20:37.765Z

### Depth Check

Did I capture the depth right?

- **Yes, you got it (Recommended)** — The summary captures the milestone accurately
- **Not quite — let me clarify** — Something is missing or wrong in the summary

**Selected:** Yes, you got it (Recommended)

---
