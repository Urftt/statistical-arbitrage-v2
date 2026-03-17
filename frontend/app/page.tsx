import { Container, Title, Text, Stack, ThemeIcon, Group } from "@mantine/core";
import { IconChartLine } from "@tabler/icons-react";

export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" justify="center" style={{ minHeight: "80vh" }}>
        <Group gap="sm">
          <ThemeIcon
            size={48}
            radius="md"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            <IconChartLine size={28} />
          </ThemeIcon>
          <Title order={1}>StatArb Research</Title>
        </Group>
        <Text c="dimmed" size="lg" ta="center">
          Statistical arbitrage research platform
        </Text>
      </Stack>
    </Container>
  );
}
