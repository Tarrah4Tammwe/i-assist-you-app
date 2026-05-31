// components/AppHeader.tsx
// Shared header used across all tab screens.
// Shows: brand name | clock | date | weather pill | day status pill (inferred + tap to override)

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../constants/theme';
import { useStore } from '../lib/store';

// ─── Weather ─────────────────────────────────────────────────────────────────

type WeatherCondition = 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm' | 'snow';

interface WeatherData {
  temp: number;
  description: string;
  condition: WeatherCondition;
}

const WEATHER_ICON: Record<WeatherCondition, { symbol: string; color: string }> = {
  'sun':       { symbol: '☀️', color: '#d4a853' },
  'cloud-sun': { symbol: '⛅', color: '#c49a3c' },
  'cloud':     { symbol: '☁️', color: '#8a9ab8' },
  'rain':      { symbol: '🌧', color: '#6a9ab8' },
  'storm':     { symbol: '⛈',  color: '#b86b5a' },
  'snow':      { symbol: '❄️', color: '#ade8f4' },
};

function mapCondition(desc: string): WeatherCondition {
  const d = desc.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return 'storm';
  if (d.includes('snow') || d.includes('sleet') || d.includes('hail')) return 'snow';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'rain';
  if (d.includes('overcast') || d.includes('fog') || d.includes('mist')) return 'cloud';
  if (d.includes('cloud') || d.includes('partly')) return 'cloud-sun';
  return 'sun';
}

async function fetchWeather(): Promise<WeatherData | null> {
  try {
    // Open-Meteo — free, no API key, uses IP geolocation approximation
    const geoRes = await fetch('https://ipapi.co/json/');
    const geo = await geoRes.json();
    const { latitude, longitude } = geo;

    const wxRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=weathercode&timezone=auto`
    );
    const wx = await wxRes.json();
    const temp = Math.round(wx.current_weather?.temperature ?? 0);
    const code = wx.current_weather?.weathercode ?? 0;

    // WMO weather codes → description
    let description = 'Clear';
    if (code === 0) description = 'Clear';
    else if (code <= 3) description = 'Partly cloudy';
    else if (code <= 9) description = 'Overcast';
    else if (code <= 19) description = 'Foggy';
    else if (code <= 29) description = 'Drizzle';
    else if (code <= 39) description = 'Rainy';
    else if (code <= 49) description = 'Snowy';
    else if (code <= 59) description = 'Rainy';
    else if (code <= 79) description = 'Snowy';
    else if (code <= 89) description = 'Stormy';
    else description = 'Stormy';

    return { temp, description, condition: mapCondition(description) };
  } catch {
    return null;
  }
}

// ─── Day status inference ─────────────────────────────────────────────────────

export type DayStatus =
  | 'In flow' | 'Focused' | 'Productive' | 'Creative'
  | 'Taking it slow' | 'Distracted' | 'Overwhelmed' | 'Flat';

const STATUS_COLOURS: Record<DayStatus, string> = {
  'In flow':        '#d4a853',
  'Focused':        '#d4a853',
  'Productive':     '#6faa88',
  'Creative':       '#6a9ab8',
  'Taking it slow': '#6b6860',
  'Distracted':     '#b86b5a',
  'Overwhelmed':    '#b86b5a',
  'Flat':           '#6b6860',
};

const ALL_STATUSES: DayStatus[] = [
  'In flow', 'Focused', 'Productive', 'Creative',
  'Taking it slow', 'Distracted', 'Overwhelmed', 'Flat',
];

function inferStatus(energy: number, blocksTotal: number, blocksDone: number): DayStatus {
  const hour = new Date().getHours();
  const progress = blocksTotal > 0 ? blocksDone / blocksTotal : 0;

  if (energy <= 2) {
    return progress > 0.3 ? 'Taking it slow' : 'Flat';
  }
  if (energy >= 4) {
    if (progress > 0.6) return 'In flow';
    if (progress > 0.3) return 'Productive';
    if (hour >= 9 && hour <= 12) return 'Focused';
    return 'Creative';
  }
  // energy 3
  if (progress > 0.5) return 'Productive';
  if (progress > 0.2) return 'Focused';
  if (hour >= 14 && hour <= 16) return 'Distracted';
  return 'Taking it slow';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { todayPlan } = useStore();

  const [clock, setClock]           = useState(new Date());
  const [weather, setWeather]       = useState<WeatherData | null>(null);
  const [statusOverride, setStatusOverride] = useState<DayStatus | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Clock tick every 30s
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch weather once on mount
  useEffect(() => {
    fetchWeather().then(setWeather);
  }, []);

  // Reset status override when new day starts
  useEffect(() => {
    setStatusOverride(null);
  }, [todayPlan?.date]);

  const energy      = todayPlan?.energy ?? 3;
  const blocksTotal = todayPlan?.blocks?.length ?? 0;
  const blocksDone  = todayPlan?.blocksDone ?? 0;
  const inferred    = inferStatus(energy, blocksTotal, blocksDone);
  const status      = statusOverride ?? inferred;
  const statusColor = STATUS_COLOURS[status];

  const timeStr = clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = clock.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const wx = weather ? WEATHER_ICON[weather.condition] : null;

  return (
    <>
      <View style={[s.hdr, { paddingTop: insets.top + 10 }]}>
        {/* Row 1: Brand + Clock */}
        <View style={s.row}>
          <Text style={s.brand}>i assist you</Text>
          <Text style={s.clock}>{timeStr}</Text>
        </View>

        {/* Row 2: Date + Weather */}
        <View style={[s.row, { marginTop: 8 }]}>
          <Text style={s.date}>{dateStr}</Text>
          {wx && weather && (
            <View style={s.weatherPill}>
              <Text style={[s.weatherIcon, { color: wx.color }]}>{wx.symbol}</Text>
              <View>
                <Text style={s.weatherTemp}>{weather.temp}°</Text>
                <Text style={s.weatherDesc}>{weather.description}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Row 3: Day status pill */}
        <View style={{ marginTop: 9 }}>
          <Pressable style={s.statusPill} onPress={() => setPickerOpen(true)}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={s.statusText}>{status}</Text>
            <Text style={s.statusEdit}>✎</Text>
          </Pressable>
        </View>
      </View>

      {/* Status override picker */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setPickerOpen(false)}>
          <View style={[s.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.pickerLabel}>How are you actually feeling right now?</Text>
            <View style={s.pickerGrid}>
              {ALL_STATUSES.map(st => (
                <Pressable
                  key={st}
                  style={[s.pickerOpt, statusOverride === st && s.pickerOptSel]}
                  onPress={() => { setStatusOverride(st); setPickerOpen(false); }}
                >
                  <View style={[s.pickerDot, { backgroundColor: STATUS_COLOURS[st] }]} />
                  <Text style={[s.pickerOptText, statusOverride === st && { color: colors.gold }]}>{st}</Text>
                </Pressable>
              ))}
            </View>
            {statusOverride && (
              <Pressable style={s.clearBtn} onPress={() => { setStatusOverride(null); setPickerOpen(false); }}>
                <Text style={s.clearBtnText}>Reset to inferred</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  hdr: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.screenPad,
    paddingBottom: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand:       { fontFamily: 'Syne-Bold', fontSize: 15, color: colors.gold, letterSpacing: -0.3 },
  clock:       { fontFamily: 'Syne-Regular', fontSize: 12, color: colors.muted2 },
  date:        { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted },
  weatherPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingVertical: 4, paddingLeft: 7, paddingRight: 10,
  },
  weatherIcon: { fontSize: 20 },
  weatherTemp: { fontFamily: 'Syne-Bold', fontSize: 12, color: colors.cream },
  weatherDesc: { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.muted },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.s1, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingVertical: 4, paddingHorizontal: 11,
  },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontFamily: 'Syne-Regular', fontSize: 10, color: colors.text },
  statusEdit:  { fontSize: 11, color: colors.muted2, marginLeft: 2 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  pickerSheet: {
    width: '100%', backgroundColor: colors.s1,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.sm,
  },
  pickerLabel: { fontFamily: 'Syne-Regular', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted, marginBottom: 4 },
  pickerGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.full, paddingVertical: 7, paddingHorizontal: 13,
  },
  pickerOptSel: { borderColor: colors.goldDim, backgroundColor: colors.goldBg },
  pickerDot:    { width: 5, height: 5, borderRadius: 3 },
  pickerOptText:{ fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
  clearBtn: {
    marginTop: 4, alignSelf: 'center',
    backgroundColor: colors.s2, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: 16,
  },
  clearBtnText: { fontFamily: 'Syne-Regular', fontSize: 11, color: colors.muted },
});
