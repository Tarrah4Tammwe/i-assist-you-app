// app/settings/devices.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function DevicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [session, setSession]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [signing, setSigning]   = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
  }, []);

  const signOutAll = () => {
    Alert.alert('Sign out everywhere', 'This will sign you out on all devices including this one.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out all', style: 'destructive', onPress: async () => {
        setSigning(true);
        await supabase.auth.signOut({ scope: 'global' });
        router.replace('/auth/login' as any);
      }},
    ]);
  };

  const signOutHere = () => {
    Alert.alert('Sign out', 'Sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/auth/login' as any);
      }},
    ]);
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Linked devices</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Manage where you're signed in.</Text>
        <Text style={s.secLbl}>Current session</Text>
        <View style={s.sessionCard}>
          <View style={s.sessionRow}>
            <View style={s.rowIcon}><Text style={s.rowIconTxt}>◱</Text></View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>This device</Text>
              <Text style={s.rowSub}>
                {session?.user?.email ?? '—'}{'\n'}
                Signed in {session?.user?.created_at ? fmtDate(session.user.created_at) : '—'}
              </Text>
            </View>
            <View style={s.activeBadge}><Text style={s.activeTxt}>● active</Text></View>
          </View>
        </View>

        <Text style={s.secLbl}>Actions</Text>
        <Pressable style={s.row} onPress={signOutHere}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>→</Text></View>
          <View style={s.rowContent}>
            <Text style={s.rowTitle}>Sign out of this device</Text>
            <Text style={s.rowSub}>You'll need to sign in again</Text>
          </View>
        </Pressable>
        <Pressable style={[s.row, s.rowDanger]} onPress={signOutAll} disabled={signing}>
          <View style={[s.rowIcon, s.rowIconRed]}><Text style={[s.rowIconTxt, { color: colors.red }]}>✕</Text></View>
          <View style={s.rowContent}>
            <Text style={[s.rowTitle, { color: colors.red }]}>Sign out everywhere</Text>
            <Text style={s.rowSub}>Removes all active sessions</Text>
          </View>
        </Pressable>
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
  sessionCard: { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  sessionRow:  { flexDirection:'row', alignItems:'center', gap:10 },
  row:         { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowDanger:   { backgroundColor:'#1e0a08', borderColor:'#3e1a14' },
  rowIcon:     { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconRed:  { backgroundColor:'#1e0a08', borderColor:'#3e1a14' },
  rowIconTxt:  { fontSize:15, color:colors.muted },
  rowContent:  { flex:1 },
  rowTitle:    { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:      { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1, lineHeight:16 },
  activeBadge: { backgroundColor:colors.greenBg, borderWidth:1, borderColor:'#1a3a28', borderRadius:radius.full, paddingVertical:2, paddingHorizontal:8 },
  activeTxt:   { fontFamily:'Syne-Medium', fontSize:9, color:colors.green },
});
