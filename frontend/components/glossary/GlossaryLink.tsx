import type { ReactNode } from 'react';
import Link from 'next/link';
import { Anchor, type AnchorProps } from '@mantine/core';
import { getGlossaryHref } from '@/lib/glossary';

interface GlossaryLinkProps extends Omit<AnchorProps, 'href' | 'component' | 'children'> {
  term: string;
  children?: ReactNode;
}

/**
 * Shared glossary deep-link helper for Academy explanatory copy.
 *
 * Centralizes the `/glossary#glossary-{slug}` contract so pages and steps do not
 * hand-roll anchor ids that can drift from the glossary dataset.
 */
export function GlossaryLink({
  term,
  children,
  fw = 600,
  c = 'blue.3',
  underline = 'always',
  ...anchorProps
}: GlossaryLinkProps) {
  return (
    <Anchor
      component={Link}
      href={getGlossaryHref(term)}
      fw={fw}
      c={c}
      underline={underline}
      style={{ textUnderlineOffset: '3px' }}
      {...anchorProps}
    >
      {children ?? term}
    </Anchor>
  );
}
