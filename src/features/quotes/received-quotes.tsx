import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText, Badge, ListItem } from '@/ui/components';
import { space } from '@/ui/theme';

import { QUOTE_STATUS_LABEL } from './form';
import { formatDate } from './pdf';
import { useReceivedQuotes } from './queries';

/** Quotes painters sent for this project. Hidden while there are none. */
export function ReceivedQuotes({ projectId }: { projectId: string }) {
  const quotes = useReceivedQuotes(projectId);
  if (!quotes.data || quotes.data.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">Gelen teklifler</AppText>
      {quotes.data.map((q) => (
        <ListItem
          key={q.id}
          title={q.title}
          subtitle={q.sent_at ? `Gönderildi: ${formatDate(q.sent_at)}` : undefined}
          onPress={() => router.push({ pathname: '/quotes/[id]', params: { id: q.id } })}>
          <View style={{ flexDirection: 'row' }}>
            <Badge label={QUOTE_STATUS_LABEL[q.status]} tone={q.status === 'accepted' ? 'success' : q.status === 'sent' ? 'primary' : 'muted'} />
          </View>
        </ListItem>
      ))}
    </View>
  );
}

