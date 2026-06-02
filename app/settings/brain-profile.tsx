// app/settings/brain-profile.tsx
// Brain profile — chip-based multi-select, feeds assistant context

import { useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';

const SECTIONS = [
  {
    key: 'identity',
    label: 'How you identify',
    note: 'Select all that apply. For your assistant\'s context only — never shown to anyone else.',
    multi: true,
    options: ['ADHD','Autism','AuDHD','Dyslexia','Dyspraxia','Dyscalculia','PDA','Hypermobility','Chronic fatigue','Anxiety','Depression','PTSD / C-PTSD','Self-diagnosed','Prefer not to say'],
  },
  {
    key: 'working_style',
    label: 'How you work best',
    multi: true,
    options: ['Burst worker','Slow starter','Morning brain','Night brain','Need body doubling','Work in silence','Need background noise','Paralysis-prone','Hyperfocus easily'],
  },
  {
    key: 'energy_patterns',
    label: 'Energy patterns',
    multi: true,
    options: ['Crashes after social','High energy mornings','Afternoon slump','Unpredictable','Low baseline','Spoon-dependent'],
  },
  {
    key: 'sensory',
    label: 'Sensory sensitivities',
    multi: true,
    options: ['Noise','Bright light','Crowds','Strong smells','Certain textures','Temperature','Unexpected touch'],
  },
  {
    key: 'triggers',
    label: 'Known dysregulation triggers',
    multi: true,
    options: ['Unexpected changes','Running late','Hunger','Overstimulation','Conflict','Uncertainty','Being observed','Deadlines'],
  },
  {
    key: 'regulation',
    label: 'Regulation strategies that work for you',
    multi: true,
    options: ['Walking','Cold water','Music','Silence','Deep pressure','Stimming','Scripted routines','Talking it out','Being alone','Napping'],
  },
  {
    key: 'comms',
    label: 'How your assistant should talk to you',
    multi: false,
    options: ['Direct, no fluff','Gentle and warm','Deadpan is fine','Very brief','More detail please'],
  },
];

export default function BrainProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [freeText, setFreeText] = useState('');

  const toggle = (sectionKey: string, option: string, multi: boolean) => {
    setSelected(prev => {
      const current = prev[sectionKey] ?? [];
      if (!multi) return { ...prev, [sectionKey]: [option] };
      return {
        ...prev,
        [sectionKey]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  };

  const isSel = (sectionKey: string, option: string) =>
    (selected[sectionKey] ?? []).includes(option);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.hdrTitle}>Brain profile</Text>
        <Pressable style={s.saveBtn}>
          <Text style={s.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageSub}>
          Everything here shapes how your assistant supports you. None of it is mandatory — fill in what feels useful.
        </Text>

        {SECTIONS.map(sec => (
          <View key={sec.key}>
            <Text style={s.secLbl}>{sec.label}</Text>
            {sec.note && <Text style={s.secNote}>{sec.note}</Text>}
            <View style={s.chipRow}>
              {sec.options.map(opt => (
                <Pressable
                  key={opt}
                  style={[s.chip, isSel(sec.key, opt) && s.chipSel]}
                  onPress={() => toggle(sec.key, opt, sec.multi)}
                >
                  <Text style={[s.chipText, isSel(sec.key, opt) && s.chipTextSel]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={s.secLbl}>Anything else</Text>
        <TextInput
          style={s.freeInput}
          placeholder="Anything your assistant should know that isn't covered above…"
          placeholderTextColor={colors.muted2}
          value={freeText}
          onChangeText={setFreeText}
          multiline
          numberOfLines={3}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  hdr:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.screenPad, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { width: 28, height: 28, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.s1, alignItems: 'center', justifyContent: 'center' },
  backArrow:    { fontSize: 18, color: colors.muted, lineHeight: 22 },
  hdrTitle:     { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold, flex: 1 },
  saveBtn:      { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: 14 },
  saveBtnText:  { fontFamily: 'Syne-Bold', fontSize: 12, color: colors.bg },
  scroll:       { paddingHorizontal: spacing.screenPad, paddingTop: 8 },
  pageSub:      { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 8 },
  secLbl:       { fontFamily: 'Syne-Regular', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted2, marginTop: 20, marginBottom: 6, paddingLeft: 2 },
  secNote:      { fontFamily: 'Literata-Light', fontStyle: 'italic', fontSize: 11, color: colors.muted, backgroundColor: colors.s1, borderRadius: radius.md, padding: 10, marginBottom: 8, lineHeight: 16 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  chip:         { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.full, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.s1 },
  chipSel:      { borderColor: colors.goldDim, backgroundColor: colors.goldBg },
  chipText:     { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  chipTextSel:  { color: colors.gold },
  freeInput:    { backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontFamily: 'Literata-Light', fontSize: 13, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
});
