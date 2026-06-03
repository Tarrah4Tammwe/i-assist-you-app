// app/settings/kit-lists.tsx
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface KitList  { id: string; name: string; }
interface KitItem  { id: string; label: string; active: boolean; sort_order: number; }

export default function KitListsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [lists, setLists]             = useState<KitList[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeList, setActiveList]   = useState<KitList | null>(null);
  const [items, setItems]             = useState<KitItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newListName, setNewListName]   = useState('');
  const [showNewList, setShowNewList]   = useState(false);
  const [newItem, setNewItem]           = useState('');

  const loadLists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('kit_lists').select('id,name').eq('user_id', user.id).order('created_at');
    setLists(data ?? []);
    setLoading(false);
  };

  const loadItems = async (listId: string) => {
    setItemsLoading(true);
    const { data } = await supabase.from('kit_list_items').select('*').eq('kit_list_id', listId).order('sort_order');
    setItems(data ?? []);
    setItemsLoading(false);
  };

  useEffect(() => { loadLists(); }, []);

  const openList = (list: KitList) => {
    setActiveList(list);
    loadItems(list.id);
  };

  const createList = async () => {
    if (!newListName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('kit_lists').insert({ user_id: user.id, name: newListName.trim() }).select().single();
    setNewListName('');
    setShowNewList(false);
    if (data) { await loadLists(); openList(data); }
  };

  const deleteList = async (id: string) => {
    Alert.alert('Delete kit list', 'This will remove the list and all its items.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('kit_lists').delete().eq('id', id);
        if (activeList?.id === id) setActiveList(null);
        loadLists();
      }},
    ]);
  };

  const addItem = async () => {
    if (!newItem.trim() || !activeList) return;
    const { data } = await supabase.from('kit_list_items')
      .insert({ kit_list_id: activeList.id, label: newItem.trim(), active: true, sort_order: items.length })
      .select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewItem('');
  };

  const toggleItem = async (item: KitItem) => {
    await supabase.from('kit_list_items').update({ active: !item.active }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
  };

  const removeItem = async (id: string) => {
    await supabase.from('kit_list_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  // ── DETAIL VIEW ──
  if (activeList) return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => setActiveList(null)} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>{activeList.name}</Text>
        <Pressable onPress={() => deleteList(activeList.id)} hitSlop={8}><Text style={s.dangerTxt}>Delete</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Tap to toggle. Active items are checked before you leave.</Text>
        <Text style={s.secLbl}>Items</Text>
        {itemsLoading && <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />}
        {items.map(item => (
          <Pressable key={item.id} style={[s.kitItem, item.active && s.kitItemOn]} onPress={() => toggleItem(item)}>
            <View style={[s.check, item.active && s.checkOn]}>
              {item.active && <Text style={s.checkMark}>✓</Text>}
            </View>
            <Text style={[s.kitLabel, item.active && s.kitLabelOn]}>{item.label}</Text>
            <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={s.delBtn}>
              <Text style={s.delTxt}>×</Text>
            </Pressable>
          </Pressable>
        ))}
        <View style={s.addItemRow}>
          <TextInput
            style={s.addItemInput}
            placeholder="Add an item…"
            placeholderTextColor={colors.muted2}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <Pressable style={s.addItemBtn} onPress={addItem}>
            <Text style={s.addItemBtnTxt}>+</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );

  // ── LIST VIEW ──
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Kit lists</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Your assistant checks these before you leave. Add what your brain forgets.</Text>
        <Text style={s.secLbl}>Your lists</Text>

        {lists.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyTxt}>No kit lists yet.</Text>
            <Text style={s.emptyHint}>Create one for going out, work, travel — whatever you always forget.</Text>
          </View>
        )}

        {lists.map(list => (
          <Pressable key={list.id} style={s.row} onPress={() => openList(list)}>
            <View style={s.rowIcon}><Text style={s.rowIconTxt}>◈</Text></View>
            <View style={s.rowContent}><Text style={s.rowTitle}>{list.name}</Text></View>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        ))}

        {showNewList ? (
          <View style={s.newListCard}>
            <Text style={s.inputLbl}>List name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Going out, Work day, Overnight…"
              placeholderTextColor={colors.muted2}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={createList}
            />
            <View style={s.newListBtns}>
              <Pressable style={s.savePrimary} onPress={createList}><Text style={s.savePrimaryTxt}>Create list</Text></Pressable>
              <Pressable style={s.cancelSmall} onPress={() => { setShowNewList(false); setNewListName(''); }}><Text style={s.cancelSmallTxt}>Cancel</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={s.ghostBtn} onPress={() => setShowNewList(true)}>
            <Text style={s.ghostPlus}>+</Text>
            <Text style={s.ghostTxt}>Create a kit list</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex:1, backgroundColor:colors.bg },
  hdr:           { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:       { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:     { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:      { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  dangerTxt:     { fontFamily:'Syne-Medium', fontSize:12, color:colors.red },
  scroll:        { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:       { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:        { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginBottom:7, paddingLeft:2 },
  row:           { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowIcon:       { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconTxt:    { fontSize:15, color:colors.muted },
  rowContent:    { flex:1 },
  rowTitle:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  chevron:       { fontSize:18, color:colors.muted2 },
  emptyCard:     { backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:16, marginBottom:10 },
  emptyTxt:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.muted, marginBottom:4 },
  emptyHint:     { fontFamily:'Literata-Light', fontSize:12, color:colors.muted2, lineHeight:17 },
  kitItem:       { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:12, padding:11, marginBottom:6 },
  kitItemOn:     { borderColor:colors.goldDim, backgroundColor:colors.goldBg },
  check:         { width:18, height:18, borderRadius:4, borderWidth:1.5, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  checkOn:       { backgroundColor:colors.gold, borderColor:colors.goldDim },
  checkMark:     { fontSize:10, color:colors.bg, fontWeight:'700' },
  kitLabel:      { flex:1, fontFamily:'Literata-Light', fontSize:13, color:colors.muted },
  kitLabelOn:    { color:colors.cream },
  delBtn:        { padding:4 },
  delTxt:        { fontSize:18, color:colors.muted2 },
  addItemRow:    { flexDirection:'row', gap:8, marginTop:8 },
  addItemInput:  { flex:1, backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, color:colors.text, fontFamily:'Literata-Light', fontSize:14, padding:11 },
  addItemBtn:    { width:44, height:44, backgroundColor:colors.gold, borderRadius:radius.md, alignItems:'center', justifyContent:'center' },
  addItemBtnTxt: { fontSize:22, color:colors.bg, fontWeight:'700' },
  newListCard:   { backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.lg, padding:14, marginTop:8 },
  inputLbl:      { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.2, textTransform:'uppercase', color:colors.muted2, marginBottom:6 },
  input:         { backgroundColor:colors.s2, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, color:colors.text, fontFamily:'Literata-Light', fontSize:14, padding:12, marginBottom:12 },
  newListBtns:   { flexDirection:'row', gap:8 },
  savePrimary:   { flex:1, backgroundColor:colors.gold, borderRadius:radius.md, padding:11, alignItems:'center' },
  savePrimaryTxt:{ fontFamily:'Syne-Bold', fontSize:13, color:colors.bg },
  cancelSmall:   { flex:1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, padding:11, alignItems:'center' },
  cancelSmallTxt:{ fontFamily:'Syne-Medium', fontSize:13, color:colors.muted },
  ghostBtn:      { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:7, backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, padding:12, marginTop:8 },
  ghostPlus:     { fontSize:16, color:colors.gold },
  ghostTxt:      { fontFamily:'Syne-Medium', fontSize:13, color:colors.text },
});
