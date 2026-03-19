'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconSkull,
  IconTrash,
  IconRefresh,
} from '@tabler/icons-react';
import type { SessionResponse } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  created: 'gray',
  running: 'green',
  stopped: 'yellow',
  error: 'red',
  killed: 'red',
};

interface SessionListProps {
  sessions: SessionResponse[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onStart: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
  onKill: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function SessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  onStart,
  onStop,
  onKill,
  onDelete,
  onRefresh,
  loading,
}: SessionListProps) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4}>Sessions</Title>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={onRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </Group>

        {sessions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            No trading sessions yet. Create one above.
          </Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pair</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Equity</Table.Th>
                <Table.Th>Trades</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session) => (
                <Table.Tr
                  key={session.session_id}
                  onClick={() => onSelectSession(session.session_id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedSessionId === session.session_id
                        ? 'var(--mantine-color-dark-5)'
                        : undefined,
                  }}
                >
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {session.config.asset1}/{session.config.asset2}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={session.is_live ? 'red' : 'teal'}
                      variant="light"
                      size="sm"
                    >
                      {session.is_live ? 'Live' : 'Paper'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={STATUS_COLORS[session.status] ?? 'gray'}
                      variant="dot"
                      size="sm"
                    >
                      {session.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      €{session.current_equity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{session.total_trades}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {new Date(session.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} onClick={(e) => e.stopPropagation()}>
                      <Tooltip label="Start session">
                        <ActionIcon
                          aria-label="Start session"
                          variant="subtle"
                          color="green"
                          size="sm"
                          onClick={() => onStart(session.session_id)}
                          disabled={session.status !== 'created' && session.status !== 'stopped'}
                        >
                          <IconPlayerPlay size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Stop session">
                        <ActionIcon
                          aria-label="Stop session"
                          variant="subtle"
                          color="yellow"
                          size="sm"
                          onClick={() => onStop(session.session_id)}
                          disabled={session.status !== 'running'}
                        >
                          <IconPlayerStop size={14} />
                        </ActionIcon>
                      </Tooltip>
                      {session.is_live && (
                        <Tooltip label="Kill session (emergency)">
                          <ActionIcon
                            aria-label="Kill session"
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => onKill(session.session_id)}
                            disabled={session.status === 'killed'}
                          >
                            <IconSkull size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip label="Delete session">
                        <ActionIcon
                          aria-label="Delete session"
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => onDelete(session.session_id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
