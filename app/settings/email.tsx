// app/settings/email.tsx
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function EmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [saving, setSaving]           = useState(false);

  const updateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your inbox', 'A confirmation link has been sent to your new email address.', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPass) { Alert.alert('Passwords don\'t match'); return; }
    if (newPassword.length < 8) { Alert.alert('Password too short', 'Use at least 8 characters.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else { Alert.alert('Password updated'); setNewPassword(''); setConfirmPass(''); router.back(); }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.hdr}>
        <Pressable onPress={() => router.back()} style={s.backBtn}><Text style={s.backArrow}>‹</Text></Pressable>
        <Text style={s.hdrTitle}>Email & password</Text>
      </View>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.secLbl}>Change email</Text>
        <Text style={s.secNote}>A confirmation link will be sent to your new address.</Text>
        <TextInput style={s.input} placeholder="New email address" placeholderTextColor={colors.muted2} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
        <Pressable style={s.primaryBtn} onPress={updateEmail} disabled={saving || !newEmail.trim()}>
          <Text style={s.primaryTxt}>{saving ? 'Sending…' : 'Update email'}</Text>
        </Pressable>

        <Text style={[s.secLbl, { marginTop: 28 }]}>Change password</Text>
        <TextInput style={s.input} placeholder="New password" placeholderTextColor={colors.muted2} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <TextInput style={[s.input, { marginTop: 8 }]} placeholder="Confirm new password" placeholderTextColor={colors.muted2} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry />
        <Pressable style={[s.primaryBtn, { marginTop: 10 }]} onPress={updatePassword} disabled={saving || !newPassword || !confirmPass}>
          <Text style={s.primaryTxt}>{saving ? 'Updating…' : 'Update password'}</Text>
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
  secLbl:     { fontFamily:'Syne-Regular', fontSize:9, letterSpacing:1.4, textTransform:'uppercase', color:colors.muted2, marginBottom:7, paddingLeft:2 },
  secNote:    { fontFamily:'Literata-Light', fontStyle:'italic', fontSize:11, color:colors.muted, backgroundColor:colors.s1, borderRadius:radius.md, padding:10, marginBottom:10, lineHeight:16 },
  input:      { backgroundColor:colors.s1, borderWidth:1.5, borderColor:colors.border, borderRadius:radius.md, color:colors.text, fontFamily:'Literata-Light', fontSize:14, padding:12 },
  primaryBtn: { backgroundColor:colors.gold, borderRadius:radius.md, padding:13, alignItems:'center', marginTop:10, opacity:1 },
  primaryTxt: { fontFamily:'Syne-Bold', fontSize:14, color:colors.bg },
});
