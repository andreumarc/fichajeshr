import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getUser, clearTokens } from '@/services/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { queueOfflineEntry, syncOfflineQueue, getOfflineQueueCount } from '@/services/offline';
import * as Network from 'expo-network';
import dayjs from 'dayjs';
import { router } from 'expo-router';

type ClockStatus = 'NOT_CLOCKED_IN' | 'WORKING' | 'ON_BREAK' | 'CLOCKED_OUT';

interface ActionBtn {
  type: string;
  label: string;
  icon: any;
  color: string;
  endpoint: string;
}

const ACTIONS: ActionBtn[] = [
  { type: 'CHECK_IN', label: 'ENTRADA', icon: 'log-in-outline', color: '#22C55E', endpoint: 'clock-in' },
  { type: 'CHECK_OUT', label: 'SALIDA', icon: 'log-out-outline', color: '#EF4444', endpoint: 'clock-out' },
  { type: 'BREAK_START', label: 'PAUSA', icon: 'cafe-outline', color: '#F59E0B', endpoint: 'break-start' },
  { type: 'BREAK_END', label: 'FIN PAUSA', icon: 'play-outline', color: '#3B82F6', endpoint: 'break-end' },
];

const AVAILABLE_ACTIONS: Record<ClockStatus, string[]> = {
  NOT_CLOCKED_IN: ['CHECK_IN'],
  WORKING: ['BREAK_START', 'CHECK_OUT'],
  ON_BREAK: ['BREAK_END', 'CHECK_OUT'],
  CLOCKED_OUT: ['CHECK_IN'],
};

export default function ClockScreen() {
  const [user, setUser] = useState<any>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [time, setTime] = useState(dayjs().format('HH:mm:ss'));
  const qc = useQueryClient();
  const { getPosition, loading: geoLoading, error: geoError } = useGeolocation();

  useEffect(() => {
    getUser().then(setUser);
    getOfflineQueueCount().then(setOfflineCount);
    const t = setInterval(() => setTime(dayjs().format('HH:mm:ss')), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => setIsOnline(!!state.isConnected));
    if (offlineCount > 0 && isOnline) {
      syncOfflineQueue().then((result) => {
        if (result.synced > 0) {
          Alert.alert('Sync', `${result.synced} fichaje(s) offline sincronizados.`);
          getOfflineQueueCount().then(setOfflineCount);
          qc.invalidateQueries({ queryKey: ['clock-status'] });
        }
      });
    }
  }, [isOnline, offlineCount]);

  const { data: statusData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clock-status'],
    queryFn: () => api.get('/time-entries/status').then((r) => r.data),
    enabled: isOnline,
    refetchInterval: 60_000,
  });

  const { data: dailySummary } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () =>
      api.get(`/time-entries/daily-summary?date=${dayjs().format('YYYY-MM-DD')}`).then((r) => r.data),
    enabled: isOnline,
    refetchInterval: 60_000,
  });

  const clockMutation = useMutation({
    mutationFn: async ({ endpoint, geoData }: { endpoint: string; geoData: any }) => {
      if (!isOnline) throw new Error('offline');
      return api.post(`/time-entries/${endpoint}`, {
        ...geoData,
        deviceType: 'MOBILE_IOS',
        clockMethod: 'EMAIL_PASSWORD',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
    },
  });

  const handleClock = async (action: ActionBtn) => {
    let geoData: any = {};

    try {
      const pos = await getPosition();
      geoData = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        workCenterId: user?.employee?.workCenterId,
      };
    } catch {
      Alert.alert(
        'Ubicación no disponible',
        geoError ?? 'No se pudo obtener la ubicación. ¿Deseas fichar de todos modos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Fichar sin GPS', onPress: () => performClock(action, geoData) },
        ],
      );
      return;
    }

    await performClock(action, geoData);
  };

  const performClock = async (action: ActionBtn, geoData: any) => {
    if (!isOnline) {
      // Queue for offline sync
      await queueOfflineEntry({
        type: action.type,
        timestamp: new Date().toISOString(),
        ...geoData,
      });
      setOfflineCount((c) => c + 1);
      Alert.alert('Fichaje guardado offline', 'Se sincronizará cuando recuperes conexión.');
      return;
    }

    try {
      await clockMutation.mutateAsync({ endpoint: action.endpoint, geoData });
      Alert.alert('✓ Fichaje registrado', `${action.label} a las ${dayjs().format('HH:mm')}`, [
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'No se pudo registrar el fichaje');
    }
  };

  const currentStatus: ClockStatus = statusData?.status ?? 'NOT_CLOCKED_IN';
  const availableActions = AVAILABLE_ACTIONS[currentStatus] ?? [];

  const statusConfig: Record<ClockStatus, { label: string; color: string; bg: string }> = {
    NOT_CLOCKED_IN: { label: 'Sin fichar', color: '#6B7280', bg: '#F3F4F6' },
    WORKING: { label: 'Trabajando', color: '#15803D', bg: '#DCFCE7' },
    ON_BREAK: { label: 'En pausa', color: '#B45309', bg: '#FEF9C3' },
    CLOCKED_OUT: { label: 'Jornada finalizada', color: '#1D4ED8', bg: '#DBEAFE' },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.firstName ?? '...'} 👋</Text>
          <Text style={styles.company}>{user?.company?.name ?? ''}</Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await clearTokens();
            router.replace('/(auth)/login');
          }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
          <Text style={styles.offlineText}>
            Sin conexión · {offlineCount > 0 ? `${offlineCount} pendiente(s)` : 'Modo offline activo'}
          </Text>
        </View>
      )}

      {/* Clock */}
      <View style={styles.clockCard}>
        <Text style={styles.clockTime}>{time}</Text>
        <Text style={styles.clockDate} numberOfLines={1}>
          {dayjs().format('dddd, D MMMM YYYY')}
        </Text>

        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: statusConfig[currentStatus].bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig[currentStatus].color }]} />
          <Text style={[styles.statusLabel, { color: statusConfig[currentStatus].color }]}>
            {statusConfig[currentStatus].label}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.actionsGrid}>
          {ACTIONS.filter((a) => availableActions.includes(a.type)).map((action) => (
            <TouchableOpacity
              key={action.type}
              style={[styles.actionBtn, { borderColor: action.color }]}
              onPress={() => handleClock(action)}
              disabled={clockMutation.isPending || geoLoading}
              activeOpacity={0.7}
            >
              {clockMutation.isPending && clockMutation.variables?.endpoint === action.endpoint ? (
                <ActivityIndicator color={action.color} size="large" />
              ) : (
                <Ionicons name={action.icon} size={42} color={action.color} />
              )}
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Daily summary */}
      {dailySummary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen de hoy</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailySummary.netWorkedHours}h</Text>
              <Text style={styles.summaryLabel}>Trabajado</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailySummary.totalBreakMinutes}m</Text>
              <Text style={styles.summaryLabel}>Pausa</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailySummary.totalWorkedHours}h</Text>
              <Text style={styles.summaryLabel}>Total bruto</Text>
            </View>
          </View>
        </View>
      )}

      {/* GPS error */}
      {geoError && (
        <View style={styles.geoErrorCard}>
          <Ionicons name="location-outline" size={18} color="#B45309" />
          <Text style={styles.geoErrorText} numberOfLines={3}>{geoError}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111827' },
  company: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 10 },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  offlineText: { color: '#92400E', fontSize: 13, fontWeight: '600' },
  clockCard: {
    backgroundColor: '#1E3A8A', borderRadius: 24, padding: 28, alignItems: 'center',
    marginBottom: 24, shadowColor: '#1E3A8A', shadowOpacity: 0.3,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  clockTime: { fontSize: 60, fontWeight: '900', color: 'white', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  clockDate: { fontSize: 14, color: '#93C5FD', marginTop: 4, textTransform: 'capitalize' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, marginTop: 16,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontWeight: '700', fontSize: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1, minWidth: '45%', backgroundColor: 'white',
    borderRadius: 20, borderWidth: 2, padding: 28, alignItems: 'center',
    gap: 12, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  actionLabel: { fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  summaryCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  summaryTitle: { fontWeight: '700', fontSize: 15, color: '#374151', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: '#F3F4F6' },
  geoErrorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  geoErrorText: { flex: 1, fontSize: 13, color: '#92400E' },
});
