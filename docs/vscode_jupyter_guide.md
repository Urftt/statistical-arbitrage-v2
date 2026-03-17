# Using Jupyter Notebooks in VS Code

This guide shows you how to run Jupyter notebooks directly in VS Code (no browser needed).

## Prerequisites

Make sure you have these VS Code extensions installed:
1. **Python** (by Microsoft) - Essential
2. **Jupyter** (by Microsoft) - For notebook support

Check by opening VS Code Command Palette (`Ctrl+Shift+P`) and searching for "Extensions".

## Quick Start

### 1. Open the Notebook

Open the notebook file in VS Code:
- Navigate to `notebooks/01_data_collection_eth_etc.ipynb`
- Click to open it
- VS Code will render it as a Jupyter notebook

### 2. Select the Python Interpreter (Kernel)

**First time only:**
- Look at the **top-right corner** of the notebook
- Click on "Select Kernel" or the kernel name
- Choose **Python Environments** → **`.venv/bin/python`**

VS Code should automatically detect the `.venv` interpreter thanks to the settings file.

### 3. Run Cells

You can run cells in several ways:

**Run a single cell:**
- Click the ▶️ play button next to the cell
- Or place cursor in cell and press `Shift+Enter`

**Run all cells:**
- Click "Run All" at the top
- Or `Ctrl+Shift+P` → "Notebook: Run All"

**Run cells above/below:**
- Use the toolbar at the top of the notebook

### 4. See Output

Output appears directly below each cell:
- Print statements
- DataFrames (nicely formatted)
- Plotly charts (interactive!)
- Error messages

## Tips & Shortcuts

### Keyboard Shortcuts
- `Shift+Enter` - Run cell and move to next
- `Ctrl+Enter` - Run cell and stay
- `Alt+Enter` - Run cell and insert new cell below
- `A` - Add cell above (in command mode)
- `B` - Add cell below (in command mode)
- `DD` - Delete cell (in command mode)
- `Esc` - Enter command mode
- `Enter` - Enter edit mode

### Command Palette (`Ctrl+Shift+P`)
Useful notebook commands:
- "Notebook: Run All"
- "Notebook: Restart Kernel"
- "Notebook: Clear All Outputs"
- "Notebook: Export As..."

## Troubleshooting

### "Kernel not found" or Import Errors

**Solution 1: Select the correct kernel**
1. Click kernel selector (top-right)
2. Choose `.venv/bin/python`

**Solution 2: Restart VS Code**
- Sometimes VS Code needs a restart to detect new virtual environments
- Close and reopen VS Code

**Solution 3: Manually verify the venv**
Open a terminal in VS Code and run:
```bash
source .venv/bin/activate
which python
# Should show: /home/luc_personal/statistical-arbitrage/.venv/bin/python
```

### Module Not Found Errors

If you get `ModuleNotFoundError` for project modules:

Add this to the first cell of your notebook:
```python
import sys
from pathlib import Path

# Add project root and src to path
project_root = Path.cwd().parent if Path.cwd().name == "notebooks" else Path.cwd()
sys.path.insert(0, str(project_root / "src"))
sys.path.insert(0, str(project_root))
```

This is already included in the notebook template!

### Plotly Charts Not Showing

Make sure you have the renderer set correctly:
```python
import plotly.io as pio
pio.renderers.default = "vscode"  # or "notebook"
```

## Workflow Example

### Starting a New Analysis Session

1. **Open VS Code** in the project directory
   ```bash
   cd ~/statistical-arbitrage
   code .
   ```

2. **Open or create a notebook**
   - Navigate to `notebooks/` folder
   - Open existing `.ipynb` file or create new one

3. **Select kernel** (first time)
   - Top-right → Select Kernel → `.venv/bin/python`

4. **Start coding!**
   - Add cells
   - Run code
   - See results inline
   - Save (`Ctrl+S`)

### Running the Data Collection Notebook

1. Open `notebooks/01_data_collection_eth_etc.ipynb`
2. Verify kernel is set to `.venv/bin/python`
3. Click "Run All" or run cells one by one
4. Watch as data is fetched and visualized!

## Advantages of VS Code Jupyter

✅ **All in one place**
- No switching between browser and IDE
- Integrated file explorer
- Git integration built-in

✅ **Better editor**
- IntelliSense/autocomplete
- Go to definition
- Inline error checking
- Better search and replace

✅ **Native feel**
- Faster than browser
- Works offline
- Better keyboard shortcuts
- Multiple notebooks in tabs

✅ **Debugging**
- Set breakpoints in notebook cells
- Step through code
- Inspect variables

## Converting Between Formats

### Export Notebook to Python Script
1. Open notebook
2. `Ctrl+Shift+P` → "Jupyter: Export to Python Script"
3. Saves as `.py` file with `# %%` cell markers

### Create Notebook from Python File
1. Create `.py` file with `# %%` to mark cells
2. Click "Run Cell" that appears above `# %%`
3. Interactive window opens
4. Can export to `.ipynb`

## Best Practices

### Organize Your Notebooks
```
notebooks/
├── 01_data_collection_eth_etc.ipynb    # Data fetching
├── 02_cointegration_analysis.ipynb     # Statistical tests
├── 03_strategy_development.ipynb       # Strategy design
├── 04_backtesting.ipynb                # Backtest results
└── experiments/                         # Ad-hoc experiments
    └── test_new_pair.ipynb
```

### Keep Notebooks Clean
- Restart kernel and "Run All" regularly to ensure reproducibility
- Clear outputs before committing to git (optional)
- Move reusable code to `src/` modules
- Use notebooks for exploration, modules for production code

### Cell Organization
```python
# Cell 1: Imports
import polars as pl
from statistical_arbitrage.data.bitvavo_client import BitvavoDataCollector

# Cell 2: Configuration
MARKET = "ETH-EUR"
INTERVAL = "1h"
DAYS_BACK = 90

# Cell 3: Data fetching
collector = BitvavoDataCollector()
df = collector.get_candles_range(...)

# Cell 4: Analysis
# ... analysis code

# Cell 5: Visualization
# ... plotting code
```

## Need Help?

- **VS Code Jupyter Docs**: https://code.visualstudio.com/docs/datascience/jupyter-notebooks
- **Python in VS Code**: https://code.visualstudio.com/docs/python/python-tutorial
- **Keyboard shortcuts**: `Ctrl+K Ctrl+S` in VS Code

Happy analyzing! 🚀
