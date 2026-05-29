import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

type AuthMethod = 'password' | 'magic';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<AuthMethod>('password');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAuDHD, setHasAuDHD] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleSignup = async () => {
    setError(null);
    if (!name.trim()) { setError('What should I call you?'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (method === 'password' && password.length < 8) {
      setError('Password needs to be at least 8 characters.'); return;
    }

    setLoading(true);

    if (method === 'magic') {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          data: { name: name.trim(), has_audhd: hasAuDHD },
          emailRedirectTo: 'iassistyou://auth/callback',
        },
      });
      if (err) { setError(err.message); setLoading(false); return; }
      setMagicSent(true);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), has_audhd: hasAuDHD },
      },
    });

    if (err) { setError(err.message); setLoading(false); return; }

    // Save name to profiles table
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: name.trim(),
        has_audhd: hasAuDHD,
      });
    }

    setLoading(false);
    router.replace('/(tabs)/morning');
  };

  // ── Magic link sent state ──────────────────────────────────────────────────
  if (magicSent) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <Pressable style={styles.backBtn} onPress={() => setMagicSent(false)}>
          <Ionicons name="arrow-back" size={16} color={colors.goldDim} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.header}>
          <Text style={styles.title}>Check your email.</Text>
          <Text style={styles.subtitle}>
            We've sent a sign-in link to {email}. Tap it and you're in.
          </Text>
        </View>
        <View style={styles.formBody}>
          <View style={styles.infoBlock}>
            <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            <Text style={styles.infoText}>
              The link expires in 10 minutes. No password needed — just tap and go.
            </Text>
          </View>
          <View style={styles.sentCard}>
            <View style={styles.sentIconWrap}>
              <Ionicons name="mail-open-outline" size={26} color={colors.muted} />
            </View>
            <Text style={styles.sentLabel}>Waiting for you to tap the link…</Text>
          </View>
        </View>
        <View style={[styles.ctaArea, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable style={styles.btnGhost} onPress={handleSignup}>
            <Text style={styles.btnGhostText}>Resend link</Text>
          </Pressable>
          <Pressable onPress={() => { setMagicSent(false); setMethod('password'); }}>
            <Text style={styles.switchLink}>
              <Text style={styles.switchLinkAccent}>Use password instead</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main signup form ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color={colors.goldDim} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Create your account.</Text>
          <Text style={styles.subtitle}>Takes about 30 seconds. No pressure on the rest.</Text>
        </View>

        {/* Method toggle */}
        <View style={styles.methodToggle}>
          <Pressable
            style={[styles.methodBtn, method === 'password' && styles.methodBtnSel]}
            onPress={() => setMethod('password')}
          >
            <Ionicons name="lock-closed-outline" size={15} color={method === 'password' ? colors.cream : colors.muted} />
            <Text style={[styles.methodBtnText, method === 'password' && styles.methodBtnTextSel]}>
              Email & password
            </Text>
          </Pressable>
          <Pressable
            style={[styles.methodBtn, method === 'magic' && styles.methodBtnSel]}
            onPress={() => setMethod('magic')}
          >
            <Ionicons name="send-outline" size={15} color={method === 'magic' ? colors.cream : colors.muted} />
            <Text style={[styles.methodBtnText, method === 'magic' && styles.methodBtnTextSel]}>
              Magic link
            </Text>
          </Pressable>
        </View>

        <View style={styles.formBody}>
          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>What should I call you?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.muted2}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.muted2}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType={method === 'password' ? 'next' : 'done'}
            />
          </View>

          {/* Password (only for password method) */}
          {method === 'password' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min. 8 characters"
                placeholderTextColor={colors.muted2}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
              />
            </View>
          )}

          {/* AuDHD optional */}
          <View style={styles.audhdField}>
            <View style={styles.audhdTop}>
              <Ionicons name="pulse-outline" size={17} color={colors.goldDim} />
              <Text style={styles.audhdLabel}>I have AuDHD</Text>
              <View style={styles.optionalChip}>
                <Text style={styles.optionalChipText}>optional</Text>
              </View>
            </View>
            <Text style={styles.audhdSub}>
              Helps me personalise how I talk to you. You can skip this — it won't affect anything.
            </Text>
            <Pressable style={styles.toggleWrap} onPress={() => setHasAuDHD(v => !v)}>
              <View style={[styles.toggle, hasAuDHD && styles.toggleOn]}>
                <View style={[styles.toggleKnob, hasAuDHD && styles.toggleKnobOn]} />
              </View>
              <Text style={styles.toggleText}>Yes, I have AuDHD (autism + ADHD)</Text>
            </Pressable>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBlock}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.ctaArea}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.85 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.btnPrimaryText}>Create account →</Text>
            }
          </Pressable>
          <Pressable onPress={() => router.push('/auth/login')}>
            <Text style={styles.switchLink}>
              Already have one?{' '}
              <Text style={styles.switchLinkAccent}>Sign in instead</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: spacing.lg, paddingBottom: 4 },
  backText: { fontFamily: 'Syne-Regular', fontSize: 13, color: colors.muted },
  header: { paddingHorizontal: spacing.screenPad, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { fontFamily: 'Syne-Bold', fontSize: 24, color: colors.cream, letterSpacing: -0.5, lineHeight: 30 },
  subtitle: { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 6 },
  methodToggle: {
    flexDirection: 'row', marginHorizontal: spacing.screenPad, marginBottom: spacing.lg,
    backgroundColor: colors.s1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: 3, gap: 3,
  },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.sm },
  methodBtnSel: { backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border2 },
  methodBtnText: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.muted },
  methodBtnTextSel: { color: colors.cream },
  formBody: { paddingHorizontal: spacing.screenPad, gap: spacing.md },
  field: { gap: 6 },
  fieldLabel: { fontFamily: 'Syne-Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
  input: {
    backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border2, borderRadius: radius.md,
    color: colors.text, fontFamily: 'Literata-Light', fontSize: 15, paddingVertical: 12, paddingHorizontal: 14,
  },
  audhdField: { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.cardPad },
  audhdTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  audhdLabel: { fontFamily: 'Syne-Medium', fontSize: 12, color: colors.text },
  optionalChip: { marginLeft: 'auto', backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border, borderRadius: 100, paddingVertical: 2, paddingHorizontal: 7 },
  optionalChipText: { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted2 },
  audhdSub: { fontFamily: 'Literata-Light', fontSize: 12, color: colors.muted, lineHeight: 18 },
  toggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  toggle: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border2 },
  toggleOn: { backgroundColor: colors.goldBg, borderColor: colors.goldDim },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.muted2, position: 'absolute', top: 2, left: 2 },
  toggleKnobOn: { backgroundColor: colors.gold, left: 20 },
  toggleText: { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 19, flex: 1 },
  errorBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1a0e0a', borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, padding: 10 },
  errorText: { fontFamily: 'Literata-Light', fontSize: 13, color: colors.red, flex: 1 },
  ctaArea: { paddingHorizontal: spacing.screenPad, paddingTop: spacing.lg, gap: spacing.sm },
  btnPrimary: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  btnPrimaryText: { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.bg, letterSpacing: 0.2 },
  btnGhost: { backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border2, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnGhostText: { fontFamily: 'Syne-Medium', fontSize: 14, color: colors.muted },
  switchLink: { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 13, color: colors.muted, textAlign: 'center' },
  switchLinkAccent: { color: colors.goldDim, textDecorationLine: 'underline' },
  infoBlock: { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { fontFamily: 'Literata-Light', fontSize: 13, color: colors.muted, lineHeight: 21, flex: 1 },
  sentCard: { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 28, alignItems: 'center', gap: 10, marginTop: 4 },
  sentIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border2, alignItems: 'center', justifyContent: 'center' },
  sentLabel: { fontFamily: 'Syne-Regular', fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
