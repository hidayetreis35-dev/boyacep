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
import { t } from '@/i18n';
import type { QuoteItemRow, QuoteRow } from '@/lib/database.types';
import { AppText, Button, Card, ErrorState, LoadingState, Notice, Screen } from '@/ui/components';
import { space } from '@/ui/theme';

/** Builds the PDF from saved rows, or from the editor's unsaved values merged over them. */
async function sharePdf(data: QuoteWithItems, draft?: { quote: QuoteRecord; items: ItemRecord[] }) {
  const quote: QuoteRow = draft ? { ...data.quote, ...draft.quote } : data.quote;
  const items: QuoteItemRow[] = draft
    ? draft.items.map((i, n) => ({ ...i, id: `draft-${n}`, quote_id: quote.id, created_at: quote.created_at }))
    : data.items;
  await shareQuotePdf(quoteHtml({ quote, items, pro: data.pro }), t('Teklif {number}', { number: quote.number }));
}

function Confirm({ question, confirmLabel, onConfirm, onCancel, busy }: { question: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <Card>
      <AppText variant="bodyStrong">{question}</AppText>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button label={t('Vazgeç')} variant="secondary" onPress={onCancel} />
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
      setPdfError(t('PDF oluşturulamadı.'));
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
            question={confirm === 'accept' ? t('Teklifi kabul ediyor musun? Usta bunu hemen görür.') : t('Teklifi reddediyor musun?')}
            confirmLabel={confirm === 'accept' ? t('Evet, kabul et') : t('Evet, reddet')}
            busy={actions.respond.isPending}
            onCancel={() => setConfirm(null)}
            onConfirm={() => actions.respond.mutate(confirm === 'accept', { onSettled: () => setConfirm(null) })}
          />
        ) : (
          <>
            <Button label={t('Teklifi kabul et')} icon="checkmark-circle" onPress={() => setConfirm('accept')} />
            <Button label={t('Reddet')} icon="close-circle" variant="ghost" onPress={() => setConfirm('reject')} />
            <Notice icon="information-circle">
              {t('Kabul etmek bir sözleşme değildir; işin detaylarını ve ödemeyi ustayla ayrıca netleştir.')}
            </Notice>
          </>
        )
      ) : null}

      {mine && quote.status === 'sent' ? (
        confirm === 'withdraw' ? (
          <Confirm
            question={t('Teklif geri çekilsin mi? Müşteri artık yanıt veremez; düzenleyip tekrar gönderebilirsin.')}
            confirmLabel={t('Geri çek')}
            busy={actions.setStatus.isPending}
            onCancel={() => setConfirm(null)}
            onConfirm={() => actions.setStatus.mutate('withdrawn', { onSettled: () => setConfirm(null) })}
          />
        ) : (
          <>
            {quote.project_id ? (
              <Notice icon="time">{t('Müşterinin yanıtı bekleniyor. Yanıt verdiğinde burada göreceksin.')}</Notice>
            ) : (
              <>
                <Button label={t('Müşteri kabul etti')} icon="checkmark-circle" variant="secondary" loading={actions.setStatus.isPending} onPress={() => actions.setStatus.mutate('accepted')} />
                <Button label={t('Müşteri kabul etmedi')} icon="close-circle" variant="ghost" disabled={busy} onPress={() => actions.setStatus.mutate('rejected')} />
              </>
            )}
            <Button label={t('Geri çek')} icon="arrow-undo" variant="ghost" disabled={busy} onPress={() => setConfirm('withdraw')} />
          </>
        )
      ) : null}

      {mine && (quote.status === 'withdrawn' || quote.status === 'rejected') ? (
        <Button label={t('Düzenle ve yeniden gönder')} icon="create" variant="secondary" loading={actions.setStatus.isPending} onPress={() => actions.setStatus.mutate('draft')} />
      ) : null}
      {mine && quote.status === 'withdrawn' ? (
        <Button label={t('Teklifi sil')} icon="trash-outline" variant="ghost" disabled={busy} onPress={() => actions.remove.mutate(undefined, { onSuccess: () => router.back() })} />
      ) : null}

      <Button label={t('PDF olarak paylaş')} icon="document" variant="secondary" onPress={() => pdf()} />
    </>
  );
}

export default function QuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuote(id);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: query.data ? t('Teklif #{number}', { number: query.data.quote.number }) : t('Teklif') }} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={t('Teklif yüklenemedi. Silinmiş olabilir ya da internet bağlantın yok.')} onRetry={() => query.refetch()} />
      ) : (
        <QuoteScreenBody id={id} data={query.data} />
      )}
    </Screen>
  );
}
