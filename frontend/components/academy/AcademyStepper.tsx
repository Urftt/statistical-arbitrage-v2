'use client';

import { Stepper } from '@mantine/core';
import {
  IconCoin,
  IconChartLine,
  IconArrowsShuffle,
  IconFlask,
  IconChartAreaLine,
  IconAdjustments,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Teaching Steps Registry — mirrors the Dash learn.py TEACHING_STEPS
// ---------------------------------------------------------------------------

interface TeachingStep {
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
}

/**
 * 6-step learning path for statistical arbitrage.
 * Exported so downstream tasks (e.g. S04 steps 4-6) can reference metadata.
 */
export const TEACHING_STEPS: TeachingStep[] = [
  {
    label: 'Select Your Pair',
    description: 'Choose two assets to analyze',
    icon: IconCoin,
  },
  {
    label: 'Price Comparison',
    description: 'Do these assets move together?',
    icon: IconChartLine,
  },
  {
    label: 'Correlation vs Cointegration',
    description: "Why correlation isn't enough",
    icon: IconArrowsShuffle,
  },
  {
    label: 'Cointegration Test',
    description: 'Proving the statistical link',
    icon: IconFlask,
  },
  {
    label: 'The Spread',
    description: 'Building the trading signal',
    icon: IconChartAreaLine,
  },
  {
    label: 'Z-Score & Signals',
    description: 'When to trade',
    icon: IconAdjustments,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AcademyStepperProps {
  activeStep: number;
  onStepClick: (step: number) => void;
}

/**
 * 6-step navigator for the Academy teaching flow.
 *
 * `allowNextStepsSelect` enables free navigation — users can click any
 * step, not just the next one. This matches the Dash app behavior.
 */
export function AcademyStepper({ activeStep, onStepClick }: AcademyStepperProps) {
  return (
    <Stepper
      active={activeStep}
      onStepClick={onStepClick}
      allowNextStepsSelect
      size="sm"
    >
      {TEACHING_STEPS.map((step) => (
        <Stepper.Step
          key={step.label}
          label={step.label}
          description={step.description}
          icon={<step.icon size={18} stroke={1.5} />}
        />
      ))}
    </Stepper>
  );
}
