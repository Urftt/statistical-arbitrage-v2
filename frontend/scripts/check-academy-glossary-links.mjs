import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const expectedTerms = [
  {
    file: 'components/academy/StepPriceComparison.tsx',
    terms: ['correlation'],
  },
  {
    file: 'components/academy/StepCorrelationVsCointegration.tsx',
    terms: ['correlation', 'cointegration'],
  },
  {
    file: 'components/academy/StepCointegrationTest.tsx',
    terms: ['cointegration', 'hedge ratio', 'ADF test'],
  },
  {
    file: 'components/academy/StepSpread.tsx',
    terms: ['spread', 'mean reversion', 'stationarity'],
  },
  {
    file: 'components/academy/StepZScoreSignals.tsx',
    terms: ['z-score', 'spread'],
  },
];

function hasGlossaryTerm(source, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<GlossaryLink[^>]*term="${escaped}"`, 'm').test(source);
}

for (const { file, terms } of expectedTerms) {
  const source = readFileSync(join(root, file), 'utf8');

  for (const term of terms) {
    assert.ok(
      hasGlossaryTerm(source, term),
      `${file} is missing GlossaryLink term="${term}"`,
    );
  }
}

const educationalPanelSource = readFileSync(
  join(root, 'components/academy/EducationalPanel.tsx'),
  'utf8',
);
assert.ok(
  !educationalPanelSource.includes('GlossaryLink'),
  'EducationalPanel must remain generic and should not import GlossaryLink.',
);

console.log('Academy glossary link source checks passed for steps 2-6.');
