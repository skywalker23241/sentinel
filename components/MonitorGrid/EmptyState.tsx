import { Center, Stack, Text } from '@mantine/core'
import { IconSearchOff } from '@tabler/icons-react'

export default function EmptyState({ message }: { message?: string }) {
  return (
    <Center mt="xl" mb="xl">
      <Stack align="center" gap="xs">
        <IconSearchOff
          size={48}
          color="var(--text-muted)"
          style={{ opacity: 0.7 }}
          aria-hidden
        />
        <Text c="dimmed" fw={500}>
          {message ?? 'No monitors match the current filters.'}
        </Text>
      </Stack>
    </Center>
  )
}
