// app/settings/integrations.tsx
// Device calendar via expo-calendar (real). Todoist coming soon.
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { colors, spacing, radius } from '../../constants/theme';

interface CalSource { id: string; title: string; color: string; allowsModifications: boolean; }

export default function IntegrationsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [calGranted, setCalGranted]   = useState<boolean | null>(null);
  const [calendars, setCalendars]     = useState<CalSource[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { checkCalendar(); }, []);

  const checkCalendar = async () => {
    const { status } = await Calendar.getCalendarPermissionsAsync();
    if (status === 'granted') {
      setCalGranted(true);
      await loadCalendars();
    } else {
      setCalGranted(false);
    }
    setLoading(false);
  };

  const loadCalendars = async () => {
    const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    setCalendars(all.map(c => ({ id: c.id, title: c.title, color: c.color ?? colors.muted, allowsModifications: c.allowsModifications })));
  };

  const requestCalendar = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      setCalGranted(true);
      await loadCalendars();
    } else {
      Alert.alert(
        'Calendar access needed',
        'Go to Settings and allow i assist you to access your calendar.',
        [{ text: 'Open Settings', onPress: () => Linking.openSettings() }, { text: 'Cancel', style: 'cancel' }]
      );
    }
  };

  const revokeCalendar = () => {
    Alert.alert(
      'Disconnect device calendar',
      'Calendar events will no longer appear in your day plan.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {
          setCalGranted(false);
          setCalendars([]);
          Linking.openSettings();
        }},
      ]
    );
  };

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Integrations</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Connected services feed into your plan automatically.</Text>

        {/* ── Device Calendar ── */}
        <Text style={s.secLbl}>{calGranted ? 'Connected' : 'Available to connect'}</Text>

        {calGranted ? (
          <View style={s.connCard}>
            <View style={s.connTop}>
              <View style={[s.rowIcon, s.rowIconGreen]}><Text style={s.rowIconTxt}>◫</Text></View>
              <View style={s.rowContent}>
                <Text style={s.rowTitle}>Device calendar</Text>
                <Text style={[s.rowSub, { color: colors.green }]}>● Connected · {calendars.length} calendar{calendars.length !== 1 ? 's' : ''}</Text>
              </View>
              <Pressable onPress={revokeCalendar} style={s.manageBtn}>
                <Text style={s.manageTxt}>Manage</Text>
              </Pressable>
            </View>
            <Text style={s.connNote}>Appointments auto-imported. Travel time calculated from your saved locations.</Text>
            {calendars.length > 0 && (
              <View style={s.calList}>
                {calendars.map(cal => (
                  <View key={cal.id} style={s.calRow}>
                    <View style={[s.calDot, { backgroundColor: cal.color }]} />
                    <Text style={s.calName}>{cal.title}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Pressable style={s.row} onPress={requestCalendar}>
            <View style={s.rowIcon}><Text style={s.rowIconTxt}>◫</Text></View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>Device calendar</Text>
              <Text style={s.rowSub}>Google, Apple, Outlook — whatever's on your phone</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        )}

        {/* ── Coming soon ── */}
        <Text style={s.secLbl}>Coming soon</Text>
        <Text style={s.secNote}>These integrations are in development. They'll appear here when ready.</Text>

        {[
          { title: 'Todoist', sub: 'Voice tasks create items in your inbox' },
          { title: 'Notion', sub: 'Send tasks to a Notion database' },
          { title: 'Microsoft To Do', sub: 'Pull tasks into your dump space' },
        ].map(item => (
          <View key={item.title} style={[s.row, s.rowDisabled]}>
            <View style={s.rowIcon}><Text style={s.rowIconTxt}>◈</Text></View>
            <View style={s.rowContent}>
              <Text style={[s.rowTitle, { color: colors.muted }]}>{item.title}</Text>
              <Text style={s.rowSub}>{item.sub}</Text>
            </View>
            <View style={s.comingSoonBadge}><Text style={s.comingSoonTxt}>Soon</Text></View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex:1, backgroundColor:colors.bg },
  hdr:            { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:        { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:      { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:       { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  scroll:         { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:        { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:         { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginTop:20, marginBottom:7, paddingLeft:2 },
  secNote:        { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:11, color:colors.muted, backgroundColor:colors.s1, borderRadius:radius.md, padding:10, marginBottom:8, lineHeight:16 },
  row:            { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowDisabled:    { opacity:0.55 },
  rowIcon:        { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconGreen:   { backgroundColor:'rgba(111,170,136,0.12)', borderColor:'rgba(111,170,136,0.25)' },
  rowIconTxt:     { fontSize:15, color:colors.muted },
  rowContent:     { flex:1 },
  rowTitle:       { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:         { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  chevron:        { fontSize:18, color:colors.muted2 },
  connCard:       { backgroundColor:colors.greenBg, borderWidth:1.5, borderColor:colors.green, borderRadius:radius.lg, padding:13, marginBottom:6 },
  connTop:        { flexDirection:'row', alignItems:'center', gap:10, marginBottom:8 },
  connNote:       { fontFamily:'Literata-Light', fontSize:12, color:colors.muted, lineHeight:17 },
  manageBtn:      { backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, borderRadius:radius.sm, paddingVertical:5, paddingHorizontal:10 },
  manageTxt:      { fontFamily:'Syne-Medium', fontSize:11, color:colors.muted },
  calList:        { marginTop:10, gap:6 },
  calRow:         { flexDirection:'row', alignItems:'center', gap:8 },
  calDot:         { width:8, height:8, borderRadius:radius.full },
  calName:        { fontFamily:'Literata-Light', fontSize:12, color:colors.text },
  comingSoonBadge:{ backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, borderRadius:radius.full, paddingVertical:2, paddingHorizontal:8 },
  comingSoonTxt:  { fontFamily:'Syne-Medium', fontSize:9, color:colors.muted2 },
});
