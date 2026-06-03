// app/settings/assistant-name.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { PERSONALITIES, PersonalityKey } from '../../constants/assistantPersonalities';
import { supabase } from '../../lib/supabase';

export default function AssistantNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedKey, setSelectedKey] = useState<PersonalityKey>('nova');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const displayName = customName.trim() || PERSONALITIES.find(p => p.key === selectedKey)?.name || 'Nova';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('assistant_name, assistant_personality')
        .eq('id', user.id)
        .single();
      if (data) {
        const isPreset = PERSONALITIES.some(p => p.name === data.assistant_name);
        if (isPreset) {
          setSelectedKey(data.assistant_personality as PersonalityKey ?? 'nova');
        } else {
          setCustomName(data.assistant_name ?? '');
          setSelectedKey(data.assistant_personality as PersonalityKey ?? 'nova');
        }
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id,
        assistant_name: displayName,
        assistant_personality: selectedKey,
        updated_at: new Date().toISOString(),
      });
    }
    setSaving(false);
    router.back();
  };

  if (loading) return (
    <View style={[s.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.hdrTitle}>Assistant name</Text>
        <Pressable onPress={save} style={s.saveBtn} disabled={saving}>
          <Text style={s.saveTxt}>{saving ? '...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.heroName}>{displayName}</Text>
        <Text style={s.heroSub}>What your assistant calls itself in conversation.</Text>

        <Text style={s.secLbl}>Choose a name</Text>
        {PERSONALITIES.map(p => (
          <Pressable
            key={p.key}
            style={[s.nameOpt, selectedKey === p.key && !customName.trim() && s.nameOptOn]}
            onPress={() => { setSelectedKey(p.key); setCustomName(''); }}
          >
            <View style={[s.dot, selectedKey === p.key && !customName.trim() && s.dotOn]} />
            <View>
              <Text style={s.nameLabel}>{p.name}</Text>
              <Text style={s.nameDesc}>{p.tagline}</Text>
            </View>
          </Pressable>
        ))}

        <Text style={[s.secLbl, { marginTop: 20 }]}>Or choose your own</Text>
        <Text style={s.secNote}>Your own name uses Nova's tone characteristics.</Text>
        <TextInput
          style={s.input}
          placeholder="Type a name…"
          placeholderTextColor={colors.muted2}
          value={customName}
          onChangeText={setCustomName}
          maxLength={24}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  hdr:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:    { width: 28, height: 28, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', justifyContent: 'center' },
  backArrow:  { fontSize: 18, color: colors.muted, lineHeight: 22 },
  hdrTitle:   { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold, letterSpacing: -0.3, flex: 1 },
  saveBtn:    { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 14 },
  saveTxt:    { fontFamily: 'Syne-Bold', fontSize: 12, color: colors.bg },
  scroll:     { paddingHorizontal: spacing.screenPad, paddingTop: 8 },
  heroName:   { fontFamily: 'Syne-Bold', fontSize: 42, color: colors.gold, textAlign: 'center', paddingTop: 20, paddingBottom: 6, letterSpacing: -1 },
  heroSub:    { fontFamily: 'Literata-LightItalic', fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 20 },
  secLbl:     { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted2, marginBottom: 7, paddingLeft: 2 },
  secNote:    { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 11, color: colors.muted, backgroundColor: colors.s1, borderRadius: radius.md, padding: 10, marginBottom: 10 },
  nameOpt:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 8 },
  nameOptOn:  { borderColor: colors.goldDim, backgroundColor: colors.goldBg },
  dot:        { width: 8, height: 8, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border2 },
  dotOn:      { backgroundColor: colors.gold, borderColor: colors.goldDim },
  nameLabel:  { fontFamily: 'Syne-Medium', fontSize: 14, color: colors.cream },
  nameDesc:   { fontFamily: 'Literata-Light', fontSize: 11, color: colors.muted, marginTop: 1 },
  input:      { backgroundColor: colors.s1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, color: colors.text, fontFamily: 'Literata-Light', fontSize: 14, padding: 12 },
});
