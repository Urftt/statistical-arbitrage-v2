'use client';

import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconHash,
  IconSearch,
  IconVocabulary,
  IconX,
} from '@tabler/icons-react';
import {
  GLOSSARY_TERMS,
  getGlossaryAliases,
  getGlossaryId,
  glossaryMatchesQuery,
} from '@/lib/glossary';

export default function GlossaryPage() {
  const [search, setSearch] = useState('');

  const normalizedSearch = search.trim();

  const filteredTerms = useMemo(
    () => GLOSSARY_TERMS.filter((entry) => glossaryMatchesQuery(entry, search)),
    [search]
  );

  const hasSearch = normalizedSearch.length > 0;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Paper
          p="xl"
          radius="lg"
          withBorder
          style={{
            background:
              'linear-gradient(135deg, rgba(32, 201, 151, 0.06) 0%, rgba(51, 154, 240, 0.06) 55%, rgba(132, 94, 247, 0.09) 100%)',
          }}
        >
          <Stack gap="md">
            <Group gap="md" align="flex-start" justify="space-between">
              <div>
                <Group gap="sm" mb={8}>
                  <ThemeIcon size="lg" radius="md" variant="light" color="grape">
                    <IconVocabulary size={20} stroke={1.7} />
                  </ThemeIcon>
                  <div>
                    <Title order={2}>Glossary</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                      Plain-English definitions for every core concept used across
                      the Academy and research workflow.
                    </Text>
                  </div>
                </Group>
              </div>

              <Badge variant="light" color="grape" size="lg">
                17 Stat Arb Terms
              </Badge>
            </Group>

            <TextInput
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search terms, aliases, or concepts like mean reversion…"
              leftSection={<IconSearch size={18} stroke={1.7} />}
              rightSection={
                hasSearch ? (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Clear glossary search"
                    onClick={() => setSearch('')}
                  >
                    <IconX size={16} stroke={1.8} />
                  </ActionIcon>
                ) : undefined
              }
              size="md"
            />

            <Group justify="space-between" gap="xs">
              <Text c="dimmed" size="sm">
                {hasSearch
                  ? `Showing ${filteredTerms.length} of ${GLOSSARY_TERMS.length} terms for “${normalizedSearch}”.`
                  : `Showing all ${GLOSSARY_TERMS.length} glossary terms so deep links always have a visible card target.`}
              </Text>
              <Text c="dimmed" size="xs">
                Search scans term name, alias, and full definition text.
              </Text>
            </Group>
          </Stack>
        </Paper>

        {filteredTerms.length > 0 ? (
          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
            {filteredTerms.map((entry) => {
              const aliases = getGlossaryAliases(entry);
              const glossaryId = getGlossaryId(entry);

              return (
                <Paper
                  key={entry.term}
                  id={glossaryId}
                  data-glossary-card="true"
                  data-glossary-term={entry.term}
                  component="article"
                  p="lg"
                  radius="lg"
                  withBorder
                  style={{
                    scrollMarginTop: 'calc(60px + var(--mantine-spacing-xl))',
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" gap="md">
                      <div>
                        <Group gap="sm" wrap="wrap">
                          <Title order={3}>{entry.term}</Title>
                          <Badge variant="outline" color="blue">
                            #{glossaryId}
                          </Badge>
                        </Group>

                        {aliases.length > 0 ? (
                          <Group gap="xs" mt={10} wrap="wrap">
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                              Also called
                            </Text>
                            {aliases.map((alias) => (
                              <Badge key={`${entry.term}-${alias}`} variant="light" color="gray">
                                {alias}
                              </Badge>
                            ))}
                          </Group>
                        ) : null}
                      </div>

                      <ThemeIcon size="lg" radius="xl" variant="light" color="blue">
                        <IconHash size={18} stroke={1.7} />
                      </ThemeIcon>
                    </Group>

                    <Text size="sm" style={{ lineHeight: 1.7 }}>
                      {entry.definition}
                    </Text>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        ) : (
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                <IconSearch size={26} stroke={1.7} />
              </ThemeIcon>
              <Title order={4}>No glossary matches</Title>
              <Text c="dimmed" size="sm" ta="center" maw={520}>
                No terms matched “{normalizedSearch}”. Try a full concept name,
                an alias like beta, or a broader idea like mean.
              </Text>
              <Button variant="light" onClick={() => setSearch('')}>
                Clear search
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
