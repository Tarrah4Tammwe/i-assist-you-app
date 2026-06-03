// app/settings/refer.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Share, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

function makeCode(uid: string) {
  return 'IAY-' + uid.slice(0,6).toUpperCase();
}

export default function ReferScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [code, setCode]           = useState('');
  const [count, setCount]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      let referralCode = makeCode(user.id);
      const { data: profile } = await supabase.from('profiles').select('referral_code').eq('id', user.id).single();
      if (profile?.referral_code) {
        referralCode = profile.referral_code;
      } else {
        await supabase.from('profiles').upsert({ id: user.id, referral_code: referralCode });
      }
      setCode(referralCode);
      const { count: c } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id);
      setCount(c ?? 0);
      setLoading(false);
    })();
  }, []);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => Share.share({
    message: `I've been using i assist you — an AI assistant built for AuDHD brains. Use my code ${code} to sign up and we both get a free month.\n\nhttps://iassist.you`,
    title: 'Try i assist you',
  });

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Refer a friend</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Each person who signs up with your code gets their first month free. So do you.</Text>

        <Text style={s.secLbl}>Your code</Text>
        <Pressable style={s.codeCard} onPress={copy}>
          <Text style={s.codeText}>{code}</Text>
          <Text style={s.codeCopy}>{copied ? 'Copied ✓' : 'Tap to copy'}</Text>
        </Pressable>

        <Pressable style={s.shareBtn} onPress={share}>
          <Text style={s.shareTxt}>Share with a friend →</Text>
        </Pressable>

        <Text style={s.secLbl}>Referrals</Text>
        <View style={s.statCard}>
          <Text style={s.statNum}>{count}</Text>
          <Text style={s.statLbl}>{count === 1 ? 'person referred' : 'people referred'}</Text>
        </View>

        <Text style={s.secLbl}>How it works</Text>
        {[
          'Share your code with someone who needs it.',
          'They sign up and enter your code.',
          'You both get one free month added to your account.',
          'No limit on how many people you can refer.',
        ].map((t, i) => (
          <View key={i} style={s.stepRow}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>{i+1}</Text></View>
            <Text style={s.stepTxt}>{t}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:colors.bg },
  hdr:        { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:    { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:  { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:   { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  scroll:     { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:    { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:     { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginTop:20, marginBottom:7, paddingLeft:2 },
  codeCard:   { backgroundColor:colors.goldBg, borderWidth:1.5, borderColor:colors.goldDim, borderRadius:radius.lg, padding:20, alignItems:'center', marginBottom:10 },
  codeText:   { fontFamily:'Syne-Bold', fontSize:28, color:colors.gold, letterSpacing:2 },
  codeCopy:   { fontFamily:'Syne-Regular', fontSize:11, color:colors.goldDim, marginTop:6 },
  shareBtn:   { backgroundColor:colors.gold, borderRadius:radius.md, padding:13, alignItems:'center' },
  shareTxt:   { fontFamily:'Syne-Bold', fontSize:14, color:colors.bg },
  statCard:   { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:20, alignItems:'center' },
  statNum:    { fontFamily:'Syne-Bold', fontSize:36, color:colors.gold },
  statLbl:    { fontFamily:'Literata-Light', fontSize:13, color:colors.muted, marginTop:4 },
  stepRow:    { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:10 },
  stepNum:    { width:24, height:24, borderRadius:radius.full, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center', marginTop:1 },
  stepNumTxt: { fontFamily:'Syne-Bold', fontSize:11, color:colors.gold },
  stepTxt:    { flex:1, fontFamily:'Literata-Light', fontSize:13, color:colors.text, lineHeight:20 },
});
