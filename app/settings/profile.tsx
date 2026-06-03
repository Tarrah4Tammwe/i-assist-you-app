// app/settings/profile.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const PRONOUNS = ['he/him','she/her','they/them','he/they','she/they','any/all'];
const AVATAR_COLORS = ['#d4a853','#6faa88','#6a9ab8','#9b85cc','#b86b5a','#c4945a'];

export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns]       = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [email, setEmail]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setEmail(user.email ?? '');
      const { data } = await supabase.from('profiles').select('display_name,pronouns,avatar_color').eq('id', user.id).single();
      if (data) {
        setDisplayName(data.display_name ?? '');
        setPronouns(data.pronouns ?? '');
        setAvatarColor(data.avatar_color ?? AVATAR_COLORS[0]);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').upsert({ id: user.id, display_name: displayName.trim() || null, pronouns: pronouns || null, avatar_color: avatarColor, updated_at: new Date().toISOString() });
    setSaving(false);
    router.back();
  };

  const initials = displayName.trim() ? displayName.trim().slice(0,2).toUpperCase() : (email.slice(0,2).toUpperCase() || '?');

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Profile</Text>
        <Pressable onPress={save} style={s.saveBtn} disabled={saving}><Text style={s.saveTxt}>{saving?'...':'Save'}</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={s.avatarRow}>
          <View style={[s.avatar, { backgroundColor: avatarColor }]}><Text style={s.avatarTxt}>{initials}</Text></View>
          <View style={s.colorPicker}>
            {AVATAR_COLORS.map(c => (
              <Pressable key={c} style={[s.colorDot, { backgroundColor: c }, avatarColor === c && s.colorDotOn]} onPress={() => setAvatarColor(c)} />
            ))}
          </View>
        </View>

        <Text style={s.secLbl}>Display name</Text>
        <TextInput style={s.input} placeholder="What should we call you?" placeholderTextColor={colors.muted2} value={displayName} onChangeText={setDisplayName} maxLength={32} />

        <Text style={s.secLbl}>Pronouns</Text>
        <View style={s.chipRow}>
          {PRONOUNS.map(p => (
            <Pressable key={p} style={[s.chip, pronouns === p && s.chipOn]} onPress={() => setPronouns(pronouns === p ? '' : p)}>
              <Text style={[s.chipTxt, pronouns === p && s.chipTxtOn]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.secLbl}>Email</Text>
        <View style={s.readonlyRow}>
          <Text style={s.readonlyTxt}>{email}</Text>
          <Pressable onPress={() => router.push('/settings/email')}><Text style={s.changeLink}>Change →</Text></Pressable>
        </View>
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
  saveBtn:     { backgroundColor:colors.gold, borderRadius:radius.md, paddingVertical:6, paddingHorizontal:14 },
  saveTxt:     { fontFamily:'Syne-Bold', fontSize:12, color:colors.bg },
  scroll:      { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  avatarRow:   { alignItems:'center', paddingVertical:20, gap:14 },
  avatar:      { width:72, height:72, borderRadius:radius.full, alignItems:'center', justifyContent:'center' },
  avatarTxt:   { fontFamily:'Syne-Bold', fontSize:24, color:colors.bg },
  colorPicker: { flexDirection:'row', gap:10 },
  colorDot:    { width:22, height:22, borderRadius:radius.full, borderWidth:2, borderColor:'transparent' },
  colorDotOn:  { borderColor:colors.cream },
  secLbl:      { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginTop:18, marginBottom:7, paddingLeft:2 },
  input:       { backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, color:colors.text, fontFamily:'Literata-Light', fontSize:14, padding:12 },
  chipRow:     { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:        { backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.full, paddingVertical:7, paddingHorizontal:14 },
  chipOn:      { borderColor:colors.goldDim, backgroundColor:colors.goldBg },
  chipTxt:     { fontFamily:'Syne-Medium', fontSize:12, color:colors.muted },
  chipTxtOn:   { color:colors.gold },
  readonlyRow: { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.md, padding:12, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  readonlyTxt: { fontFamily:'Literata-Light', fontSize:13, color:colors.muted },
  changeLink:  { fontFamily:'Syne-Medium', fontSize:12, color:colors.gold },
});
