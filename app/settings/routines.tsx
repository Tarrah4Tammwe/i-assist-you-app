// app/settings/routines.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Routines {
  wake_time: string;
  wind_down_time: string;
  transition_buffer: number;
  get_ready_mins: number;
  max_plan_blocks: number;
}

const DEFAULTS: Routines = {
  wake_time: '07:30',
  wind_down_time: '21:00',
  transition_buffer: 10,
  get_ready_mins: 20,
  max_plan_blocks: 10,
};

const WAKE_OPTS  = ['05:30','06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00'];
const WIND_OPTS  = ['18:00','19:00','20:00','20:30','21:00','21:30','22:00','22:30','23:00'];
const BUFFER_OPTS= [5,10,15,20,30];
const READY_OPTS = [10,15,20,30,45,60];
const BLOCK_OPTS = [4,5,6,7,8,9,10,11,12];

function fmt24(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

export default function RoutinesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [r, setR]     = useState<Routines>(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState<{ key: keyof Routines; title: string; opts: (string|number)[]; } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('wake_time,wind_down_time,transition_buffer,get_ready_mins,max_plan_blocks').eq('id', user.id).single();
      if (data) setR({ ...DEFAULTS, ...Object.fromEntries(Object.entries(data).filter(([,v])=>v!=null)) } as Routines);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('profiles').upsert({ id: user.id, ...r, updated_at: new Date().toISOString() });
    setSaving(false);
    router.back();
  };

  const pick = (val: string | number) => {
    if (!modal) return;
    setR(prev => ({ ...prev, [modal.key]: val }));
    setModal(null);
  };

  const rows: { key: keyof Routines; icon: string; title: string; sub: string; displayVal: string; opts: (string|number)[]; }[] = [
    { key:'wake_time',          icon:'◎', title:'Wake time',          sub:'Your day plan starts from here',      displayVal: fmt24(r.wake_time),    opts: WAKE_OPTS  },
    { key:'wind_down_time',     icon:'◑', title:'Wind-down time',     sub:'No new blocks scheduled after this',  displayVal: fmt24(r.wind_down_time),opts: WIND_OPTS  },
    { key:'transition_buffer',  icon:'◷', title:'Transition buffer',  sub:'Breathing room between blocks',       displayVal:`${r.transition_buffer} min`, opts: BUFFER_OPTS },
    { key:'get_ready_mins',     icon:'⌂', title:'Get-ready time',     sub:'Before leaving for appointments',     displayVal:`${r.get_ready_mins} min`,    opts: READY_OPTS  },
    { key:'max_plan_blocks',    icon:'≡', title:'Max blocks per day', sub:'Keeps the plan from overwhelming',    displayVal:`${r.max_plan_blocks}`,       opts: BLOCK_OPTS  },
  ];

  if (loading) return <View style={[s.container,{paddingTop:insets.top,alignItems:'center',justifyContent:'center'}]}><ActivityIndicator color={colors.gold}/></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Routines & defaults</Text>
        <Pressable onPress={save} style={s.saveBtn} disabled={saving}><Text style={s.saveTxt}>{saving?'...':'Save'}</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.pageSub}>Shapes how your assistant structures your day — timing, buffers, block count.</Text>

        <Text style={s.secLbl}>Timing</Text>
        {rows.slice(0,2).map(({ key, ...row }) => <SettingsRow key={key} {...row} onPress={()=>setModal({key,title:row.title,opts:row.opts})}/>)}

        <Text style={s.secLbl}>Buffers</Text>
        {rows.slice(2,4).map(({ key, ...row }) => <SettingsRow key={key} {...row} onPress={()=>setModal({key,title:row.title,opts:row.opts})}/>)}

        <Text style={s.secLbl}>Plan shape</Text>
        {rows.slice(4).map(({ key, ...row }) => <SettingsRow key={key} {...row} onPress={()=>setModal({key,title:row.title,opts:row.opts})}/>)}
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <Pressable style={s.modalBg} onPress={() => setModal(null)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>{modal?.title}</Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {modal?.opts.map(o => {
                const cur = r[modal.key];
                const isOn = String(o) === String(cur);
                const label = typeof o === 'string' && o.includes(':') ? fmt24(o) : `${o}${typeof o==='number'&&modal.key!=='max_plan_blocks'?' min':''}`;
                return (
                  <Pressable key={String(o)} style={[s.modalOpt, isOn && s.modalOptOn]} onPress={() => pick(o)}>
                    <Text style={[s.modalOptTxt, isOn && { color: colors.gold }]}>{label}</Text>
                    {isOn && <Text style={{ color: colors.gold, fontSize: 14 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={s.modalCancel} onPress={() => setModal(null)}><Text style={s.modalCancelTxt}>Cancel</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SettingsRow({ icon, title, sub, displayVal, onPress }: { icon:string; title:string; sub:string; displayVal:string; onPress:()=>void }) {
  return (
    <Pressable style={s.row} onPress={onPress}>
      <View style={s.rowIcon}><Text style={s.rowIconTxt}>{icon}</Text></View>
      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Text style={s.rowVal}>{displayVal}</Text>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  hdr:          { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:spacing.screenPad, paddingVertical:14, borderBottomWidth:1, borderBottomColor:colors.border },
  backBtn:      { width:28, height:28, borderRadius:radius.full, borderWidth:1, borderColor:colors.border, backgroundColor:colors.s1, alignItems:'center', justifyContent:'center' },
  backArrow:    { fontSize:18, color:colors.muted, lineHeight:22 },
  hdrTitle:     { fontFamily:'Syne-Bold', fontSize:15, color:colors.gold, letterSpacing:-0.3, flex:1 },
  saveBtn:      { backgroundColor:colors.gold, borderRadius:radius.md, paddingVertical:6, paddingHorizontal:14 },
  saveTxt:      { fontFamily:'Syne-Bold', fontSize:12, color:colors.bg },
  scroll:       { paddingHorizontal:spacing.screenPad, paddingTop:8 },
  pageSub:      { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:12, color:colors.muted, lineHeight:18, marginBottom:8 },
  secLbl:       { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginTop:20, marginBottom:7, paddingLeft:2 },
  row:          { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:colors.s1, borderWidth:1, borderColor:colors.border, borderRadius:radius.lg, padding:12, marginBottom:6 },
  rowIcon:      { width:32, height:32, borderRadius:radius.sm, backgroundColor:colors.s2, borderWidth:1, borderColor:colors.border, alignItems:'center', justifyContent:'center' },
  rowIconTxt:   { fontSize:15, color:colors.muted },
  rowContent:   { flex:1 },
  rowTitle:     { fontFamily:'Syne-Medium', fontSize:13, color:colors.cream },
  rowSub:       { fontFamily:'Literata-Light', fontSize:11, color:colors.muted, marginTop:1 },
  rowVal:       { fontFamily:'Syne-Regular', fontSize:12, color:colors.muted, marginRight:4 },
  chevron:      { fontSize:18, color:colors.muted2 },
  modalBg:      { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  modalSheet:   { backgroundColor:colors.s1, borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, borderWidth:1.5, borderColor:colors.border2 },
  modalTitle:   { fontFamily:'Syne-Bold', fontSize:15, color:colors.cream, marginBottom:14 },
  modalOpt:     { backgroundColor:colors.s2, borderWidth:1.5, borderColor:colors.border, borderRadius:12, padding:12, marginBottom:6, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  modalOptOn:   { borderColor:colors.goldDim, backgroundColor:colors.goldBg },
  modalOptTxt:  { fontFamily:'Syne-Medium', fontSize:13, color:colors.text },
  modalCancel:  { borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, padding:11, marginTop:4, alignItems:'center' },
  modalCancelTxt:{ fontFamily:'Syne-Medium', fontSize:13, color:colors.muted },
});
