'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Group,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import CreateSessionForm from '@/components/trading/CreateSessionForm';
import SessionList from '@/components/trading/SessionList';
import SessionDetail from '@/components/trading/SessionDetail';
import {
  deleteTradingSession,
  fetchTradingSessions,
  killTradingSession,
  startTradingSession,
  stopTradingSession,
  type SessionResponse,
} from '@/lib/api';

export default function TradingPage() {
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kill switch modal state
  const [killModalOpen, setKillModalOpen] = useState(false);
  const [killTargetId, setKillTargetId] = useState<string | null>(null);
  const [killing, setKilling] = useState(false);

  // Increment to force SessionDetail refetch after actions
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTradingSessions();
      setSessions(res.sessions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch sessions'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleStart(sessionId: string) {
    try {
      await startTradingSession(sessionId);
      await loadSessions();
      setDetailRefreshKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start session'
      );
    }
  }

  async function handleStop(sessionId: string) {
    try {
      await stopTradingSession(sessionId);
      await loadSessions();
      setDetailRefreshKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to stop session'
      );
    }
  }

  function handleKillRequest(sessionId: string) {
    setKillTargetId(sessionId);
    setKillModalOpen(true);
  }

  async function handleKillConfirm() {
    if (!killTargetId) return;
    setKilling(true);
    try {
      await killTradingSession(killTargetId);
      setKillModalOpen(false);
      setKillTargetId(null);
      await loadSessions();
      setDetailRefreshKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to kill session'
      );
      setKillModalOpen(false);
    } finally {
      setKilling(false);
    }
  }

  async function handleDelete(sessionId: string) {
    try {
      await deleteTradingSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
      await loadSessions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete session'
      );
    }
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Title order={2}>Trading</Title>

        {error && (
          <Alert
            color="red"
            variant="light"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <CreateSessionForm onSessionCreated={loadSessions} />

        <SessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onStart={handleStart}
          onStop={handleStop}
          onKill={handleKillRequest}
          onDelete={handleDelete}
          onRefresh={loadSessions}
          loading={loading}
        />

        {selectedSessionId && (
          <SessionDetail
            sessionId={selectedSessionId}
            refreshKey={detailRefreshKey}
          />
        )}
      </Stack>

      {/* Kill switch confirmation modal */}
      <Modal
        opened={killModalOpen}
        onClose={() => setKillModalOpen(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="var(--mantine-color-red-6)" />
            <Text fw={600}>Kill Switch — Confirm</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Text>
            This will immediately close all positions via market orders.{' '}
            <Text span fw={700}>
              This action cannot be undone.
            </Text>
          </Text>
          <Text size="sm" c="dimmed">
            All open positions will be flattened and the session will be
            permanently marked as killed.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setKillModalOpen(false)}
              disabled={killing}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleKillConfirm}
              loading={killing}
            >
              Confirm Kill
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
