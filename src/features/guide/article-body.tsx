import { Text, View } from 'react-native';

import { AppText } from '@/ui/components';
import { space, usePalette } from '@/ui/theme';

import { parseMarkdown, type Inline } from './markdown';

function Inlines({ inlines }: { inlines: Inline[] }) {
  return (
    <AppText>
      {inlines.map((part, i) => (
        <Text key={i} style={part.bold ? { fontWeight: '700' } : undefined}>
          {part.text}
        </Text>
      ))}
    </AppText>
  );
}

export function ArticleBody({ body }: { body: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: space.md }}>
      {parseMarkdown(body).map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <AppText key={i} variant="heading" accessibilityRole="header" style={{ marginTop: space.sm }}>
                {block.text}
              </AppText>
            );
          case 'paragraph':
            return <Inlines key={i} inlines={block.inlines} />;
          case 'bullets':
          case 'steps':
            return (
              <View key={i} style={{ gap: space.sm }}>
                {block.items.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', gap: space.sm }}>
                    <AppText variant="bodyStrong" style={{ color: p.primary, minWidth: 20 }}>
                      {block.type === 'steps' ? `${j + 1}.` : '•'}
                    </AppText>
                    <View style={{ flex: 1 }}>
                      <Inlines inlines={item} />
                    </View>
                  </View>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}
