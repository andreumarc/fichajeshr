import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  CHECK_IN: { label: 'Entrada', icon: 'log-in-outline', color: '#22C55E' },
  CHECK_OUT: { label: 'Salida', icon: 'log-out-outline', color: '#EF4444' },
  BREAK_START: { label: 'Pausa', icon: 'cafe-outline', color: '#F59E0B' },
  BREAK_END: { label: 'Fin pausa', icon: 'play-outline', color: '#3B82F6' },
  INCIDENT: { label: 'Incidencia', icon: 'warning-outline', color: '#8B5CF6' },
};

export default function HistoryScreen() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-history', page],
    queryFn: () => api.get('/time-entries/my-history', { params: { page, limit: 50 } }).then((r) => r.data),
  });

  const renderEntry = ({ item }: any) => {
    const conf = typeConfig[item.type] ?? { label: item.type, icon: 'time-outline', color: '#6B7280' };
    return (
      <View style={styles.entry}>
        <View style={[styles.entryIcon, { backgroundColor: conf.color + '20' }]}>
          <Ionicons name={conf.icon} size={20} color={conf.color} />
        </View>
        <View style={styles.entryBody}>
          <Text style={styles.entryType}>{conf.label}</Text>
          <Text style={styles.entryTime}>{dayjs(item.timestamp).format('DD/MM/YYYY · HH:mm:ss')}</Text>
          {item.workCenter?.name && (
            <Text style={styles.entryCenter}>{item.workCenter.name}</Text>
          )}
        </View>
        <View style={styles.entryRight}>
          {item.isWithinZone === false && (
            <Ionicons name="location-outline" size={14} color="#F59E0B" />
          )}
          {item.isManual && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi historial</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay fichajes registrados</Text>
          }
          ListFooterComponent={
            data && data.total > data.limit ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                >
                  <Ionicons name="chevron-back" size={16} color={page === 1 ? '#9CA3AF' : '#2563EB'} />
                </TouchableOpacity>
                <Text style={styles.pageText}>Página {page}</Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(data.total / data.limit)}
                  style={[styles.pageBtn, page >= Math.ceil(data.total / data.limit) && styles.pageBtnDisabled]}
                >
                  <Ionicons name="chevron-forward" size={16} color={page >= Math.ceil(data.total / data.limit) ? '#9CA3AF' : '#2563EB'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  list: { paddingBottom: 40 },
  entry: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  entryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryBody: { flex: 1 },
  entryType: { fontWeight: '700', fontSize: 14, color: '#111827' },
  entryTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  entryCenter: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 4 },
  manualBadge: { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  manualBadgeText: { fontSize: 10, color: '#1D4ED8', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 16 },
  pageBtn: { padding: 10, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: 14, color: '#374151', fontWeight: '600' },
});
