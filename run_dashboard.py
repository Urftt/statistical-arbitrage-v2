#!/usr/bin/env python
"""Launch the StatArb Research dashboard."""
import sys
from pathlib import Path

# Ensure src is on the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from statistical_arbitrage.app.main import run

if __name__ == "__main__":
    run()
