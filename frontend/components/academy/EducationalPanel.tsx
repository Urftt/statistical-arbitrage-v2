'use client';

import { Accordion, Group, Text } from '@mantine/core';
import {
  IconBulb,
  IconTool,
  IconChartDots,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EducationalPanelProps {
  /** Content for the "💡 Intuition" panel — explains the concept simply. */
  intuition: ReactNode;
  /** Content for the "🔧 How It Works" panel — technical mechanics. */
  mechanics: ReactNode;
  /** Content for the "📊 Your Pair" panel — pair-specific observations. */
  pairSpecific: ReactNode;
}

/**
 * 3-layer educational accordion used by every Academy step.
 *
 * Matches the Dash app's EducationalPanel pattern:
 * - 💡 Intuition — opens by default
 * - 🔧 How It Works
 * - 📊 Your Pair
 *
 * Each layer's content is passed as a ReactNode prop, keeping this
 * component agnostic to the specific educational content.
 */
export function EducationalPanel({ intuition, mechanics, pairSpecific }: EducationalPanelProps) {
  return (
    <Accordion
      multiple
      variant="separated"
      radius="md"
      defaultValue={['intuition']}
    >
      <Accordion.Item value="intuition">
        <Accordion.Control
          icon={<IconBulb size={20} stroke={1.5} color="var(--mantine-color-yellow-5)" />}
        >
          <Group gap="xs">
            <Text fw={500}>💡 Intuition</Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>{intuition}</Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="mechanics">
        <Accordion.Control
          icon={<IconTool size={20} stroke={1.5} color="var(--mantine-color-blue-5)" />}
        >
          <Group gap="xs">
            <Text fw={500}>🔧 How It Works</Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>{mechanics}</Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="your-pair">
        <Accordion.Control
          icon={<IconChartDots size={20} stroke={1.5} color="var(--mantine-color-teal-5)" />}
        >
          <Group gap="xs">
            <Text fw={500}>📊 Your Pair</Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>{pairSpecific}</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
