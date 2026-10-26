import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Children,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type HostInstance,
  type ScrollViewInstance,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from './motion';
import { MAX_CONTENT_WIDTH, MAX_WIDE_WIDTH, MIN_TOUCH, WIDE_BREAKPOINT, fonts, radius, shadowOf, space, type, usePalette, type Palette, type TypeVariant } from './theme';

import { t, toUpper } from '@/i18n';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Tone = 'muted' | 'primary' | 'danger' | 'success' | 'accent';

function toneColor(p: Palette, tone?: Tone): string {
  switch (tone) {
    case 'muted':
      return p.textMuted;
    case 'primary':
      return p.primary;
    case 'danger':
      return p.danger;
    case 'success':
      return p.success;
    case 'accent':
      return p.accent;
    default:
      return p.text;
  }
}

export function AppText({
  variant = 'body',
  tone,
  style,
  children,
  ...rest
}: TextProps & { variant?: TypeVariant; tone?: Tone }) {
  const p = usePalette();
  // Overlines are upper case. textTransform would drop the dot of the Turkish İ on iOS and web.
  const content = variant === 'overline' ? Children.map(children, (c) => (typeof c === 'string' ? toUpper(c) : c)) : children;
  return (
    <Text style={[type[variant] as TextStyle, { color: toneColor(p, tone) }, style]} {...rest}>
      {content}
    </Text>
  );
}

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const p = usePalette();
  return <Ionicons name={name} size={size} color={color ?? p.text} />;
}

/** Scrollable page with safe area, background and a centred max width. */
type ScrollToView = (view: HostInstance | null) => void;
const ScrollContext = createContext<ScrollToView>(() => {});
const ScrollTopContext = createContext<() => void>(() => {});

/** Scrolls the surrounding Screen back to the top, e.g. when a wizard moves to the next step. */
export function useScrollToTop(): () => void {
  return useContext(ScrollTopContext);
}

/** Scrolls the surrounding Screen so `view` sits at the top, e.g. to reveal results. */
export function useScrollToView(): ScrollToView {
  return useContext(ScrollContext);
}

/** Scrollable page with safe area, background and a centred max width. */
/** True on desktop browsers and large tablets, where two columns fit. */
export function useWide(): boolean {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}

/**
 * Two columns on wide windows, one column on phones. `sideFirst` keeps the
 * phone order when the side column holds what a phone shows first.
 */
export function Columns({ main, side, sideFirst = false }: { main: ReactNode; side: ReactNode; sideFirst?: boolean }) {
  const wide = useWide();
  if (!wide) return sideFirst ? <>{side}{main}</> : <>{main}{side}</>;
  return (
    <View style={styles.columns}>
      <View style={styles.mainColumn}>{main}</View>
      <View style={styles.sideColumn}>{side}</View>
    </View>
  );
}

/** Cards in a two-column grid on wide windows, a list on phones. */
export function Grid({ children }: { children: ReactNode }) {
  const wide = useWide();
  if (!wide) return <View style={{ gap: space.sm }}>{children}</View>;
  return (
    <View style={styles.grid}>
      {Children.map(children, (child) => (child ? <View style={styles.gridCell}>{child}</View> : null))}
    </View>
  );
}

/** `wide` lets a screen with Columns or Grid use the desktop width. */
export function Screen({ children, edges = ['top'], wide = false }: { children: ReactNode; edges?: ('top' | 'bottom')[]; wide?: boolean }) {
  const p = usePalette();
  const isWide = useWide() && wide;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const innerRef = useRef<HostInstance>(null);
  const scrollToView = useCallback<ScrollToView>((view) => {
    const inner = innerRef.current;
    if (!view || !inner) return;
    view.measureLayout(inner, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true }));
  }, []);
  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), []);

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: p.background }}>
        <View ref={innerRef} style={[styles.screenInner, isWide && { maxWidth: MAX_WIDE_WIDTH, paddingHorizontal: space.xl }]}>
          <ScrollTopContext.Provider value={scrollToTop}>
            <ScrollContext.Provider value={scrollToView}>{children}</ScrollContext.Provider>
          </ScrollTopContext.Provider>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Lays fields side by side with equal widths. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      {Children.map(children, (child) => (child ? <View style={{ flex: 1, minWidth: 0 }}>{child}</View> : null))}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, shadowOf(p), style]}>{children}</View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  size = 'md',
}: {
  label: string;
  onPress: () => void;
  /** cta: the one main action on a screen (orange). */
  variant?: 'primary' | 'cta' | 'secondary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'lg';
}) {
  const p = usePalette();
  const fg = variant === 'primary' ? p.onPrimary : variant === 'cta' ? p.onCta : p.primary;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'lg' && styles.buttonLg,
        variant === 'primary' && { backgroundColor: pressed ? p.primaryPressed : p.primary },
        variant === 'cta' && [{ backgroundColor: pressed ? p.ctaPressed : p.cta }, shadowOf(p)],
        variant === 'secondary' && { backgroundColor: pressed ? p.surfaceMuted : p.primarySoft },
        variant === 'ghost' && { backgroundColor: pressed ? p.surfaceMuted : 'transparent' },
        (disabled || loading) && { opacity: 0.45 },
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <AppText variant="bodyStrong" style={{ color: fg, fontFamily: fonts.bold }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  error?: string;
  hint?: string;
  testID?: string;
  placeholder?: string;
};

export function TextField({
  label,
  value,
  onChangeText,
  unit,
  error,
  hint,
  testID,
  placeholder,
  multiline,
  ...inputProps
}: FieldProps &
  Pick<
    TextInputProps,
    'keyboardType' | 'inputMode' | 'autoCapitalize' | 'autoComplete' | 'autoCorrect' | 'maxLength' | 'onSubmitEditing' | 'textContentType' | 'autoFocus'
  > & { multiline?: boolean }) {
  const p = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: focused ? p.surface : p.surfaceMuted,
            borderColor: error ? p.danger : focused ? p.primary : 'transparent',
          },
        ]}>
        <TextInput
          accessibilityLabel={label}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={p.textMuted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          style={[
            styles.input,
            multiline ? (type.body as TextStyle) : (type.bodyStrong as TextStyle),
            multiline && styles.multiline,
            { color: p.text },
            webNoOutline,
          ]}
          {...inputProps}
        />
        {unit ? (
          <AppText variant="bodyStrong" tone="muted">
            {unit}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function NumberField(props: FieldProps) {
  return <TextField keyboardType="decimal-pad" inputMode="decimal" {...props} />;
}

/** Single choice from a small set, shown as chips. Labels go through t(), so constant lists can pass msg() text. */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={styles.field}>
      {label ? (
        <AppText variant="small" style={{ fontFamily: fonts.semibold }}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? p.primary : p.surfaceMuted,
                  borderColor: selected ? p.primary : 'transparent',
                },
              ]}>
              <AppText variant="small" style={{ color: selected ? p.onPrimary : p.text, fontFamily: fonts.semibold }}>
                {t(o.label)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.toggle, { borderColor: value ? p.primary : 'transparent', backgroundColor: value ? p.primarySoft : p.surfaceMuted }]}>
      <Icon name={value ? 'checkmark-circle' : 'ellipse-outline'} color={value ? p.primary : p.textMuted} />
      <AppText variant="bodyStrong">{label}</AppText>
    </Pressable>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const p = usePalette();
  const btn = (icon: IconName, next: number, a11y: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={next < min || next > max}
      onPress={() => onChange(next)}
      style={[styles.stepBtn, { backgroundColor: p.primarySoft, opacity: next < min || next > max ? 0.35 : 1 }]}>
      <Icon name={icon} color={p.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <AppText variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </AppText>
      {btn('remove', value - 1, t('{label} azalt', { label }))}
      <AppText variant="heading" style={{ minWidth: 32, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {value}
      </AppText>
      {btn('add', value + 1, t('{label} artır', { label }))}
    </View>
  );
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'accent' | 'success' | 'primary' }) {
  const p = usePalette();
  const bg = { muted: p.surfaceMuted, accent: p.accentSoft, success: p.successSoft, primary: p.primarySoft }[tone];
  const fg = { muted: p.textMuted, accent: p.accent, success: p.success, primary: p.primary }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <AppText variant="caption" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}

export function Notice({
  tone = 'info',
  icon = 'information-circle',
  children,
}: {
  tone?: 'info' | 'accent' | 'danger' | 'success';
  icon?: IconName;
  children: ReactNode;
}) {
  const p = usePalette();
  const bg = { info: p.primarySoft, accent: p.accentSoft, danger: p.dangerSoft, success: p.successSoft }[tone];
  const fg = { info: p.primary, accent: p.accent, danger: p.danger, success: p.success }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon} color={fg} size={20} />
      <AppText variant="small" style={{ flex: 1 }}>
        {children}
      </AppText>
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message: string; action?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: p.accentSoft }]}>
        <Icon name={icon} size={34} color={p.cta} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

export function LoadingState({ label = t('Yükleniyor…') }: { label?: string }) {
  const p = usePalette();
  return (
    <View style={styles.empty} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={p.primary} size="large" />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline"
      title={t('Bir sorun oluştu')}
      message={message}
      action={onRetry ? <Button label={t('Tekrar dene')} icon="refresh" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} tone={strong ? undefined : 'muted'} style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

// The focused border already shows focus, so drop the browser's default outline.
const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const styles = StyleSheet.create({
  screenContent: { flexGrow: 1, alignItems: 'center', paddingBottom: space.xxl },
  screenInner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, padding: space.lg, gap: space.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl },
  mainColumn: { flex: 3, minWidth: 0, gap: space.lg },
  sideColumn: { flex: 2, minWidth: 0, gap: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  gridCell: { width: '50%', padding: space.xs },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.lg + 2, gap: space.md },
  button: {
    minHeight: MIN_TOUCH + 8,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonLg: { minHeight: 58, paddingHorizontal: space.xl },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', gap: space.md },
  inputRow: {
    minHeight: MIN_TOUCH + 8,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: space.sm },
  multiline: { minHeight: 240, paddingVertical: space.md },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: MIN_TOUCH + 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
  },
  toggle: {
    flex: 1,
    minHeight: MIN_TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
  notice: { flexDirection: 'row', gap: space.sm, borderRadius: radius.md, padding: space.md + 2, alignItems: 'flex-start' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 28 },
});

/** A tappable row for lists: title, optional details below, chevron on the right. */
export function ListItem({
  title,
  subtitle,
  children,
  right,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  right?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        { borderColor: p.border, backgroundColor: pressed ? p.surfaceMuted : p.surface },
        shadowOf(p),
      ]}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>
      {right}
      <Icon name="chevron-forward" color={p.textMuted} />
    </PressableScale>
  );
}
