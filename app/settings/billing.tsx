// app/settings/billing.tsx
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Billing & invoices</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Manage your subscription and payment details.</Text>
        <Text style={s.secLbl}>Current plan</Text>
        <Pressable style={s.row} onPress={() => router.push('/settings/subscription' as any)}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>✦</Text></View>
          <View style={s.rowContent}>
            <Text style={s.rowTitle}>Your plan</Text>
            <Text style={s.rowSub}>Spark · Free tier</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
        <Text style={s.secLbl}>Invoices</Text>
        <View style={s.emptyCard}>
          <Text style={s.emptyTxt}>No invoices yet.</Text>
          <Text style={s.emptyHint}>Invoices appear here once you upgrade to a paid plan.</Text>
        </View>
        <Text style={s.secLbl}>Help</Text>
        <Pressable style={s.row} onPress={() => Linking.openURL('mailto:billing@iassistyou.com')}>
          <View style={s.rowIcon}><Text style={s.rowIconTxt}>◎</Text></View>
          <View style={s.rowContent}><Text style={s.rowTitle}>Billing support</Text><Text style={s.rowSub}>billing@iassistyou.com</Text></View>
          <Text style={s.chevron}>›</Text>
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
  row:        { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowIcon:    { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconTxt: { fontSize:15, color:colors.muted },
  rowContent: { flex:1 },
  rowTitle:   { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:     { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  chevron:    { fontSize:18, color:colors.muted2 },
  emptyCard:  { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:16, marginBottom:6 },
  emptyTxt:   { fontFamily:'Syne-Medium', fontSize:13, color:colors.muted, marginBottom:4 },
  emptyHint:  { fontFamily:'Literata-Light', fontSize:12, color:colors.muted2, lineHeight:17 },
});
