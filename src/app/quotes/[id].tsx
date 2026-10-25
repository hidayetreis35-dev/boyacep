import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/features/account/session';
import type { QuoteWithItems } from '@/features/quotes/api';
import { shareQuotePdf } from '@/features/quotes/export';
import { emptyQuoteForm, quoteToForm, type ItemRecord, type QuoteRecord } from '@/features/quotes/form';
import { quoteHtml } from '@/features/quotes/pdf';
import { useQuote, useQuoteActions } from '@/features/quotes/queries';
import { QuoteEditor } from '@/features/quotes/quote-editor';
import { QuoteView } from '@/features/quotes/quote-view';
import type { QuoteItemRow, QuoteRow } from '@/lib/database.types';
import { AppText, Button, Card, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

/** Builds the PDF from saved rows, or from the editor's unsaved values merged over them. */
async function sharePdf(data: QuoteWithItems, draft?: { quote: QuoteRecord; items: ItemRecord[] }) {
  const quote: QuoteRow = draft ? { ...data.quote, ...draft.quote } : data.quote;
  const items: QuoteItemRow[] = draft
    ? draft.items.map((i, n) => ({ ...i, id: `draft-${n}`, quote_id: quote.id, created_at: quote.created_at }))
    : data.items;
  await shareQuotePdf(quoteHtml({ quote, items, pro: data.pro }), `Teklif ${quote.number}`);
}

function Confirm({ question, confirmLabel, onConfirm, onCancel, busy }: { question: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <Card>
      <AppText variant="bodyStrong">{question}</AppText>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button label="Vazgeç" variant="secondary" onPress={onCancel} />
        <Button label={confirmLabel} loading={busy} onPress={onConfirm} />
      </View>
    </Card>
  );
}

function QuoteScreenBody({ id, data }: { id: string; data: QuoteWithItems }) {
  const { session } = useSession();
  const actions = useQuoteActions(id);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'accept' | 'reject' | 'withdraw'>(null);
  const { quote, items, pro } = data;
  const mine = quote.pro_id === session?.user.id;

  const pdf = async (draft?: { quote: QuoteRecord; items: ItemRecord[] }) => {
    setPdfError(null);
    try {
      await sharePdf(data, draft);
    } catch {
      setPdfError('PDF oluşturulamadı.');
    }
  };

  const busy = actions.save.isPending || actions.setStatus.isPending || actions.remove.isPending || actions.respond.isPending;
  const error =
    (actions.save.error ?? actions.setStatus.error ?? actions.remove.error ?? actions.respond.error)?.message ?? pdfError;

  if (mine && quote.status === 'draft') {
    return (
      <QuoteEditor
        key={quote.updated_at}
        quote={quote}
        // A saved draft always has items; a brand-new one starts from the defaults.
        initial={items.length > 0 ? quoteToForm(quote, items) : emptyQuoteForm(quote.title)}
        busy={busy}
        error={error}
        onSave={(d, then) =>
          actions.save.mutate(d, { onSuccess: () => (then === 'send' ? actions.setStatus.mutate('sent') : undefined) })
        }
        onPdf={(d) => pdf(d)}
        onDelete={() => actions.remove.mutate(undefined, { onSuccess: () => router.back() })}
      />
    );
  }

  return (
    <>
      <QuoteView quote={quote} items={items} pro={pro} showPro={!mine} />
      {error ? (
        <Notice tone="danger" icon="alert-circle">
          {error}
        </Notice>
      ) : null}

      {!mine && quote.status === 'sent' ? (
        confirm === 'accept' || confirm === 'reject' ? (
          <Confirm
            question={confirm === 'accept' ? 'Teklifi kabul ediyor musun? Usta bunu hemen görür.' : 'Teklifi reddediyor musun?'}
            confirmLabel={confirm === 'accept' ? 'Evet, kabul et' : 'Evet, reddet'}
            busy={actions.respond.isPending}
            onCancel={() => setConfirm(null)}
            onConfirm={() => actions.respond.mutate(confirm === 'accept', { onSettled: () => setConfirm(null) })}
          />
        ) : (
          <>
            <Button label="Teklifi kabul et" icon="checkmark-circle" onPress={() => setConfirm('accept')} />
            <Button label="Reddet" icon="close-circle" variant="ghost" onPress={() => setConfirm('reject')} />
            <Notice icon="information-circle">
              Kabul etmek bir sözleşme değildir; işin detaylarını ve ödemeyi ustayla ayrıca netleştir.
            </Notice>
          </>
        )
      ) : null}

      {mine && quote.status === 'sent' ? (
        confirm === 'withdraw' ? (
          <Confirm
            question="Teklif geri çekilsin mi? Müşteri artık yanıt veremez; düzenleyip tekrar gönderebilirsin."
            confirmLabel="Geri çek"
            busy={actions.setStatus.isPending}
            onCancel={() => setConfirm(null)}
            onConfirm={() => actions.setStatus.mutate('withdrawn', { onSettled: () => setConfirm(null) })}
          />
        ) : (
          <>
            {quote.project_id ? (
              <Notice icon="time">Müşterinin yanıtı bekleniyor. Yanıt verdiğinde burada göreceksin.</Notice>
            ) : (
              <>
                <Button label="Müşteri kabul etti" icon="checkmark-circle" variant="secondary" loading={actions.setStatus.isPending} onPress={() => actions.setStatus.mutate('accepted')} />
                <Button label="Müşteri kabul etmedi" icon="close-circle" variant="ghost" disabled={busy} onPress={() => actions.setStatus.mutate('rejected')} />
              </>
            )}
            <Button label="Geri çek" icon="arrow-undo" variant="ghost" disabled={busy} onPress={() => setConfirm('withdraw')} />
          </>
        )
      ) : null}

      {mine && (quote.status === 'withdrawn' || quote.status === 'rejected') ? (
        <Button label="Düzenle ve yeniden gönder" icon="create" variant="secondary" loading={actions.setStatus.isPending} onPress={() => actions.setStatus.mutate('draft')} />
      ) : null}
      {mine && quote.status === 'withdrawn' ? (
        <Button label="Teklifi sil" icon="trash-outline" variant="ghost" disabled={busy} onPress={() => actions.remove.mutate(undefined, { onSuccess: () => router.back() })} />
      ) : null}

      <Button label="PDF olarak paylaş" icon="document" variant="secondary" onPress={() => pdf()} />
    </>
  );
}

export default function QuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuote(id);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: query.data ? `Teklif #${query.data.quote.number}` : 'Teklif' }} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Teklif yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok." onRetry={() => query.refetch()} />
      ) : (
        <QuoteScreenBody id={id} data={query.data} />
      )}
    </Screen>
  );
}
