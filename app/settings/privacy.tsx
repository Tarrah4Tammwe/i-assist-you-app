// app/settings/privacy.tsx
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function PrivacyScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [patternLearning, setPatternLearning] = useState(true);

  const deleteData = () => {
    Alert.alert(
      'Delete all your data',
      'This permanently removes your plans, dumps, energy logs, and settings. Your account stays active.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete data', style: 'destructive', onPress: async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await Promise.all([
            supabase.from('plans').delete().eq('user_id', user.id),
            supabase.from('dumps').delete().eq('user_id', user.id),
            supabase.from('energy_log').delete().eq('user_id', user.id),
            supabase.from('locations').delete().eq('user_id', user.id),
            supabase.from('kit_lists').delete().eq('user_id', user.id),
          ]);
          Alert.alert('Data deleted', 'Your data has been removed.');
        }},
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => {
          Alert.alert('Contact us', 'Email delete@iassistyou.com to complete account deletion.');
        }},
      ]
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Privacy & data</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>What we store, what we learn, and how to remove it.</Text>

        <Text style={s.secLbl}>Pattern learning</Text>
        <Text style={s.secNote}>When on, your assistant learns from your energy patterns over time to build better day plans.</Text>
        <View style={s.switchRow}>
          <View style={s.rowContent}>
            <Text style={s.rowTitle}>Learn from my energy patterns</Text>
            <Text style={s.rowSub}>Improves plan accuracy over time</Text>
          </View>
          <Switch value={patternLearning} onValueChange={setPatternLearning} trackColor={{ true: colors.gold, false: colors.border }} thumbColor={colors.cream} />
        </View>

        <Text style={s.secLbl}>Your data</Text>
        <Pressable style={s.row} onPress={() => Linking.openURL('https://iassist.you/privacy')}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>◎</Text></View>
          <View style={s.rowContent}><Text style={s.rowTitle}>Privacy policy</Text><Text style={s.rowSub}>What we collect and why</Text></View>
          <Text style={s.chevron}>›</Text>
        </Pressable>

        <Text style={s.secLbl}>Danger zone</Text>
        <Pressable style={[s.row, s.rowDanger]} onPress={deleteData}>
          <View style={[s.rowIcon, s.rowIconRed]}><Text style={[s.rowIconTxt, { color: colors.red }]}>✕</Text></View>
          <View style={s.rowContent}><Text style={[s.rowTitle, { color: colors.red }]}>Delete all my data</Text><Text style={s.rowSub}>Keeps your account. Removes all history.</Text></View>
        </Pressable>
        <Pressable style={[s.row, s.rowDanger]} onPress={deleteAccount}>
          <View style={[s.rowIcon, s.rowIconRed]}><Text style={[s.rowIconTxt, { color: colors.red }]}>✕</Text></View>
          <View style={s.rowContent}><Text style={[s.rowTitle, { color: colors.red }]}>Delete account</Text><Text style={s.rowSub}>Permanently removes everything</Text></View>
        </Pressable>
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
  secNote:    { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:11, color:colors.muted, backgroundColor:colors.s1, borderRadius:radius.md, padding:10, marginBottom:8, lineHeight:16 },
  switchRow:  { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  row:        { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowDanger:  { backgroundColor:'#1e0a08', borderColor:'#3e1a14' },
  rowIcon:    { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconRed: { backgroundColor:'#1e0a08', borderColor:'#3e1a14' },
  rowIconTxt: { fontSize:15, color:colors.muted },
  rowContent: { flex:1 },
  rowTitle:   { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:     { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  chevron:    { fontSize:18, color:colors.muted2 },
});
