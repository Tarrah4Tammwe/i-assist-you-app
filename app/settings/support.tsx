// app/settings/support.tsx
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { colors, spacing, radius } from '../../constants/theme';

const FAQ = [
  { q: 'Why does my plan feel wrong for my energy level?', a: 'Head to Morning and rebuild your day — the plan is only as good as the energy and context you give it. If you\'re low energy, say so honestly.' },
  { q: 'Can I add tasks that aren\'t on my plan?', a: 'Yes. The Do tab is for anything that comes up mid-day — research, decisions, or structuring a task that\'s not in your plan.' },
  { q: 'What does body doubling mode do?', a: 'It keeps a quiet presence with you while you work, checks in at intervals you choose, and nudges you gently if you go quiet for too long.' },
  { q: 'How does the pre-departure checklist work?', a: 'When you have a fixed appointment in your plan, your assistant generates a checklist based on your kit lists and notifies you before you need to leave.' },
  { q: 'Is my data private?', a: 'Your plan data and dumps are stored securely in your account and never used to train AI models. See Privacy & data in settings.' },
];

export default function SupportScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(null);
  const version  = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Help & support</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Answers to common questions, and a way to reach us.</Text>

        <Text style={s.secLbl}>FAQ</Text>
        {FAQ.map((item, i) => (
          <Pressable key={i} style={[s.faqCard, open === i && s.faqCardOpen]} onPress={() => setOpen(open === i ? null : i)}>
            <View style={s.faqTop}>
              <Text style={s.faqQ}>{item.q}</Text>
              <Text style={s.faqChev}>{open === i ? '∧' : '∨'}</Text>
            </View>
            {open === i && <Text style={s.faqA}>{item.a}</Text>}
          </Pressable>
        ))}

        <Text style={s.secLbl}>Contact</Text>
        <Pressable style={s.row} onPress={() => Linking.openURL('mailto:hello@iassistyou.com?subject=Feedback')}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>◎</Text></View>
          <View style={s.rowContent}><Text style={s.rowTitle}>Send feedback</Text><Text style={s.rowSub}>hello@iassistyou.com</Text></View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <Pressable style={s.row} onPress={() => Linking.openURL('mailto:bugs@iassistyou.com?subject=Bug report')}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>◈</Text></View>
          <View style={s.rowContent}><Text style={s.rowTitle}>Report a bug</Text><Text style={s.rowSub}>bugs@iassistyou.com</Text></View>
          <Text style={s.chevron}>›</Text>
        </Pressable>

        <Text style={s.version}>i assist you · v{version}{'\n'}Made for neurodivergent brains</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:colors.bg },
  hdr:         { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:     { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:   { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:    { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  scroll:      { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:     { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:      { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginTop:20, marginBottom:7, paddingLeft:2 },
  faqCard:     { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:13, marginBottom:6 },
  faqCardOpen: { borderColor:colors.border2 },
  faqTop:      { flexDirection:'row', alignItems:'flex-start', gap:8 },
  faqQ:        { flex:1, fontFamily:'Syne-Medium', fontSize:13, color:colors.cream, lineHeight:19 },
  faqChev:     { fontSize:12, color:colors.muted, marginTop:2 },
  faqA:        { fontFamily:'Literata-Light', fontSize:13, color:colors.text, lineHeight:20, marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:colors.border },
  row:         { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowIcon:     { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconTxt:  { fontSize:15, color:colors.muted },
  rowContent:  { flex:1 },
  rowTitle:    { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:      { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  chevron:     { fontSize:18, color:colors.muted2 },
  version:     { textAlign:'center', fontFamily:'Syne-Regular', fontSize:10, color:colors.muted2, marginTop:28, lineHeight:18 },
});
