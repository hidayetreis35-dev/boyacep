import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EMPTY_ROOM_FORM, toRoomInput, type FormErrors, type RoomForm } from '@/features/calculator/form';
import { RoomFormFields } from '@/features/calculator/room-form-fields';
import { inputToRecord, roomToForm } from '@/features/projects/mapping';
import { useDeleteRoom, useProject, useSaveRoom } from '@/features/projects/queries';
import { t } from '@/i18n';
import { Button, Card, ErrorState, LoadingState, Notice, Screen, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

function RoomEditor({ projectId, initial }: { projectId: string; initial: { id?: string; name: string; form: RoomForm } }) {
  const [name, setName] = useState(initial.name);
  const [form, setForm] = useState<RoomForm>(initial.form);
  const [errors, setErrors] = useState<FormErrors & { name?: string }>({});
  const save = useSaveRoom(projectId);
  const remove = useDeleteRoom();

  const set = <K extends keyof RoomForm>(key: K, value: RoomForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    const parsed = toRoomInput(form);
    const nameError = name.trim() ? undefined : t('Oda adı yazın.');
    if (!parsed.ok || nameError) {
      setErrors({ ...(parsed.ok ? {} : parsed.errors), name: nameError });
      return;
    }
    setErrors({});
    const { room, openings } = inputToRecord(parsed.input);
    save.mutate({ roomId: initial.id, name, room, openings }, { onSuccess: () => router.back() });
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: initial.id ? t('Odayı düzenle') : t('Yeni oda') }} />
      <Card>
        <TextField
          label={t('Oda adı')}
          placeholder={t('Örn. Salon')}
          value={name}
          onChangeText={setName}
          maxLength={80}
          error={errors.name}
          testID="room-name"
        />
      </Card>
      <RoomFormFields form={form} errors={errors} set={set} />
      {save.isError ? (
        <Notice tone="danger" icon="alert-circle">
          {t('Kaydedilemedi: {message}', { message: save.error.message })}
        </Notice>
      ) : null}
      <Button label={t('Kaydet')} icon="checkmark" onPress={submit} loading={save.isPending} />
      {initial.id ? (
        <View style={{ gap: space.sm }}>
          {remove.isError ? (
            <Notice tone="danger" icon="alert-circle">
              {t('Silinemedi: {message}', { message: remove.error.message })}
            </Notice>
          ) : null}
          <Button
            label={t('Odayı sil')}
            icon="trash"
            variant="ghost"
            loading={remove.isPending}
            onPress={() => remove.mutate(initial.id!, { onSuccess: () => router.back() })}
          />
        </View>
      ) : null}
    </Screen>
  );
}

export default function RoomScreen() {
  const { id, roomId } = useLocalSearchParams<{ id: string; roomId?: string }>();
  const query = useProject(id);

  if (query.isPending) return <Screen edges={['bottom']}><LoadingState /></Screen>;
  if (query.isError) return <Screen edges={['bottom']}><ErrorState message={t('Proje yüklenemedi.')} onRetry={() => query.refetch()} /></Screen>;

  const existing = roomId ? query.data.rooms.find((r) => r.id === roomId) : undefined;
  if (roomId && !existing) {
    return <Screen edges={['bottom']}><ErrorState message={t('Bu oda bulunamadı; silinmiş olabilir.')} /></Screen>;
  }

  return (
    <RoomEditor
      key={roomId ?? 'new'}
      projectId={id}
      initial={
        existing
          ? { id: existing.id, name: existing.name, form: roomToForm(existing) }
          : { name: '', form: EMPTY_ROOM_FORM }
      }
    />
  );
}
