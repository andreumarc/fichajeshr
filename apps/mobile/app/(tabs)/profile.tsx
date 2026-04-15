import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { clearTokens } from '@/services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

function ProfileRow({
  icon, label, value,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color="#64748B" />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  const { data: me, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
  });

  const { data: status } = useQuery({
    queryKey: ['my-clock-status'],
    queryFn: () => api.get('/time-entries/my/status').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/auth/logout', {});
            } catch {}
            await clearTokens();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const name = me ? `${me.firstName} ${me.lastName}` : 'Usuario';
  const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        {me?.employee?.workCenter && (
          <View style={styles.workCenterBadge}>
            <Ionicons name="business-outline" size={12} color="#2563EB" />
            <Text style={styles.workCenterText}>{me.employee.workCenter.name}</Text>
          </View>
        )}
        {status && (
          <View style={[
            styles.statusPill,
            status.currentStatus === 'CLOCKED_IN' ? styles.statusIn
              : status.currentStatus === 'ON_BREAK' ? styles.statusBreak
              : styles.statusOut,
          ]}>
            <View style={[
              styles.statusDot,
              status.currentStatus === 'CLOCKED_IN' ? styles.statusDotIn
                : status.currentStatus === 'ON_BREAK' ? styles.statusDotBreak
                : styles.statusDotOut,
            ]} />
            <Text style={[
              styles.statusText,
              status.currentStatus === 'CLOCKED_IN' ? { color: '#059669' }
                : status.currentStatus === 'ON_BREAK' ? { color: '#D97706' }
                : { color: '#64748B' },
            ]}>
              {status.currentStatus === 'CLOCKED_IN' ? 'Trabajando'
                : status.currentStatus === 'ON_BREAK' ? 'En pausa'
                : 'Desconectado'}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <View style={styles.card}>
          <ProfileRow icon="person-outline" label="Nombre" value={name} />
          <View style={styles.divider} />
          <ProfileRow icon="mail-outline" label="Email" value={me?.email ?? '—'} />
          <View style={styles.divider} />
          <ProfileRow icon="id-card-outline" label="Código empleado" value={me?.employee?.employeeCode ?? '—'} />
          <View style={styles.divider} />
          <ProfileRow icon="briefcase-outline" label="Cargo" value={me?.employee?.position ?? '—'} />
        </View>
      </View>

      {/* Today's summary */}
      {status?.todaySummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de hoy</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {(status.todaySummary.workedMinutes / 60).toFixed(1)}h
              </Text>
              <Text style={styles.summaryLabel}>Trabajadas</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#D97706' }]}>
                {Math.round(status.todaySummary.breakMinutes)}m
              </Text>
              <Text style={styles.summaryLabel}>Pausas</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: '#2563EB' }]}>
                {status.todaySummary.entries ?? 0}
              </Text>
              <Text style={styles.summaryLabel}>Fichajes</Text>
            </View>
          </View>
        </View>
      )}

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(auth)/change-password')}>
            <Ionicons name="lock-closed-outline" size={18} color="#334155" />
            <Text style={styles.menuItemText}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/incidents')}>
            <Ionicons name="alert-circle-outline" size={18} color="#334155" />
            <Text style={styles.menuItemText}>Mis incidencias</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aplicación</Text>
        <View style={styles.card}>
          <ProfileRow icon="information-circle-outline" label="Versión" value="1.0.0" />
          <View style={styles.divider} />
          <ProfileRow
            icon="server-outline"
            label="Servidor"
            value={process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'localhost:1000'}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#DC2626" />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 40 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#4F46E5' },
  name: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  workCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  workCenterText: { fontSize: 12, color: '#2563EB', fontWeight: '500' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusIn: { backgroundColor: '#ECFDF5' },
  statusBreak: { backgroundColor: '#FFFBEB' },
  statusOut: { backgroundColor: '#F8FAFC' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotIn: { backgroundColor: '#10B981' },
  statusDotBreak: { backgroundColor: '#F59E0B' },
  statusDotOut: { backgroundColor: '#94A3B8' },
  statusText: { fontSize: 12, fontWeight: '600' },

  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  rowValue: { fontSize: 14, color: '#334155', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F8FAFC', marginLeft: 60 },

  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  summaryLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuItemText: { fontSize: 14, color: '#334155', fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
});
