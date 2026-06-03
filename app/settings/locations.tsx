// app/settings/locations.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Location { id?: string; label: string; type: 'home'|'work'|'other'; address: string; }

const TYPE_ICONS: Record<string, string> = { home:'⌂', work:'⊞', other:'◈' };

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState<{ loc: Location; isNew: boolean } | null>(null);
  const [editLabel, setEditLabel]   = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editType, setEditType]     = useState<'home'|'work'|'other'>('other');
  const [saving, setSaving]         = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('locations').select('*').eq('user_id', user.id).order('created_at');
    setLocations(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (loc: Location, isNew = false) => {
    setEditLabel(loc.label);
    setEditAddress(loc.address);
    setEditType(loc.type);
    setModal({ loc, isNew });
  };

  const saveLocation = async () => {
    if (!editLabel.trim() || !editAddress.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    if (modal?.isNew) {
      await supabase.from('locations').insert({ user_id: user.id, label: editLabel.trim(), address: editAddress.trim(), type: editType });
    } else if (modal?.loc.id) {
      await supabase.from('locations').update({ label: editLabel.trim(), address: editAddress.trim(), type: editType }).eq('id', modal.loc.id);
    }
    setSaving(false);
    setModal(null);
    load();
  };

  const deleteLocation = async (id?: string) => {
    if (!id) return;
    Alert.alert('Remove location', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('locations').delete().eq('id', id);
        load();
      }},
    ]);
  };

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Saved locations</Text>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Used for travel time calculation and pre-departure kit reminders.</Text>
        <Text style={s.secLbl}>Saved places</Text>

        {locations.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTxt}>No locations saved yet.</Text>
            <Text style={s.emptyHint}>Add home or work to get travel time in your plan.</Text>
          </View>
        )}

        {locations.map(loc => (
          <Pressable key={loc.id} style={s.row} onPress={() => openEdit(loc)}>
            <View style={s.rowIcon}><Text style={s.rowIconTxt}>{TYPE_ICONS[loc.type]}</Text></View>
            <View style={s.rowContent}>
              <Text style={s.rowTitle}>{loc.label}</Text>
              <Text style={s.rowSub}>{loc.address}</Text>
            </View>
            <Pressable onPress={() => deleteLocation(loc.id)} hitSlop={8} style={s.delBtn}>
              <Text style={s.delTxt}>×</Text>
            </Pressable>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}

        <Pressable style={s.ghostBtn} onPress={() => openEdit({ label:'', type:'other', address:'' }, true)}>
          <Text style={s.ghostPlus}>+</Text>
          <Text style={s.ghostTxt}>Add a location</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <Pressable style={s.modalBg} onPress={() => setModal(null)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>{modal?.isNew ? 'Add location' : 'Edit location'}</Text>

            <Text style={s.inputLbl}>Label</Text>
            <TextInput style={s.input} placeholder="e.g. Home, Work, Gym…" placeholderTextColor={colors.muted2} value={editLabel} onChangeText={setEditLabel} />

            <Text style={s.inputLbl}>Address</Text>
            <TextInput style={s.input} placeholder="Full address or place name" placeholderTextColor={colors.muted2} value={editAddress} onChangeText={setEditAddress} />

            <Text style={s.inputLbl}>Type</Text>
            <View style={s.typeRow}>
              {(['home','work','other'] as const).map(t => (
                <Pressable key={t} style={[s.typeChip, editType === t && s.typeChipOn]} onPress={() => setEditType(t)}>
                  <Text style={[s.typeChipTxt, editType === t && { color: colors.gold }]}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={s.savePrimary} onPress={saveLocation} disabled={saving}>
              <Text style={s.savePrimaryTxt}>{saving ? 'Saving…' : 'Save location'}</Text>
            </Pressable>
            <Pressable style={s.modalCancel} onPress={() => setModal(null)}>
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex:1, backgroundColor:colors.bg },
  hdr:           { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:       { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:     { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:      { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  scroll:        { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:       { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:        { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginBottom:7, paddingLeft:2 },
  row:           { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowIcon:       { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconTxt:    { fontSize:15, color:colors.muted },
  rowContent:    { flex:1 },
  rowTitle:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:        { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  chevron:       { fontSize:18, color:colors.muted2 },
  delBtn:        { padding:4, marginRight:2 },
  delTxt:        { fontSize:18, color:colors.muted2 },
  emptyCard:     { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:16, marginBottom:10 },
  emptyTxt:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.muted, marginBottom:4 },
  emptyHint:     { fontFamily:'Literata-Light', fontSize:12, color:colors.muted2, lineHeight:17 },
  ghostBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7, backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, padding:12, marginTop:8 },
  ghostPlus:     { fontSize:16, color:colors.gold },
  ghostTxt:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.text },
  modalBg:       { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  modalSheet:    { backgroundColor:colors.s1, borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, borderWidth:1.5, borderColor:colors.border2 },
  modalTitle:    { fontFamily:'Syne-Bold', fontSize:15, color:colors.cream, marginBottom:16 },
  inputLbl:      { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.2, textTransform:'uppercase', color:colors.muted2, marginBottom:6 },
  input:         { backgroundColor:colors.s2, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, color:colors.text, fontFamily:'Literata-Light', fontSize:14, padding:12, marginBottom:12 },
  typeRow:       { flexDirection:'row', gap:8, marginBottom:16 },
  typeChip:      { flex:1, backgroundColor:colors.s2, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.full, padding:8, alignItems:'center' },
  typeChipOn:    { borderColor:colors.goldDim, backgroundColor:colors.goldBg },
  typeChipTxt:   { fontFamily:'Syne-Medium', fontSize:11, color:colors.muted },
  savePrimary:   { backgroundColor:colors.gold, borderRadius:radius.md, padding:13, alignItems:'center', marginBottom:8 },
  savePrimaryTxt:{ fontFamily:'Syne-Bold', fontSize:14, color:colors.bg },
  modalCancel:   { borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, padding:11, alignItems:'center' },
  modalCancelTxt:{ fontFamily:'Syne-Medium', fontSize:13, color:colors.muted },
});
