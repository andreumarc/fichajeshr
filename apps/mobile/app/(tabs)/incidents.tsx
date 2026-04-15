import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Modal, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api as apiClient } from '@/services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  OPEN:      { label: 'Abierta',     color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle-outline' },
  IN_REVIEW: { label: 'En revisión', color: '#2563EB', bg: '#DBEAFE', icon: 'time-outline' },
  RESOLVED:  { label: 'Resuelta',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
  REJECTED:  { label: 'Rechazada',   color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const INCIDENT_TYPES = [
  { value: 'MISSING_CHECK_IN',  label: 'Olvidé fichar entrada' },
  { value: 'MISSING_CHECK_OUT', label: 'Olvidé fichar salida' },
  { value: 'LATE_ARRIVAL',      label: 'Llegada tarde' },
  { value: 'EARLY_DEPARTURE',   label: 'Salida anticipada' },
  { value: 'OUT_OF_ZONE',       label: 'Fichaje fuera de zona' },
  { value: 'OTHER',             label: 'Otro' },
];

export default function IncidentsScreen() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'OTHER', description: '' });
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-incidents-mobile'],
    queryFn: () => apiClient.get('/incidents/my', { params: { page: 1, limit: 50 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/incidents/my', {
        type: form.type,
        description: form.description,
        occurredAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-incidents-mobile'] });
      setShowModal(false);
      setForm({ type: 'OTHER', description: '' });
    },
  });

  const incidents: any[] = data?.data ?? [];
  const currentTypeLabel = INCIDENT_TYPES.find(t => t.value === form.type)?.label ?? 'Otro';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Incidencias</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando…</Text>
        </View>
      ) : incidents.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin incidencias</Text>
          <Text style={styles.emptySubtitle}>No tienes incidencias registradas</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />
          }
        >
          {incidents.map((inc: any) => {
            const cfg = STATUS_CONFIG[inc.status] ?? STATUS_CONFIG.OPEN;
            return (
              <View key={inc.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTypeRow}>
                    <Ionicons name={cfg.icon} size={16} color={cfg.color} />
                    <Text style={styles.cardType} numberOfLines={1}>
                      {INCIDENT_TYPES.find(t => t.value === inc.type)?.label ?? inc.type}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={styles.cardDesc}>{inc.description}</Text>

                {inc.resolution && (
                  <View style={styles.resolutionBox}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.resolutionText}>{inc.resolution}</Text>
                  </View>
                )}

                <Text style={styles.cardDate}>
                  {dayjs(inc.occurredAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* New incident modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva incidencia</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Type picker */}
            <Text style={styles.fieldLabel}>Tipo de incidencia</Text>
            <TouchableOpacity
              style={styles.typePicker}
              onPress={() => setTypePickerOpen((v) => !v)}
            >
              <Text style={styles.typePickerText}>{currentTypeLabel}</Text>
              <Ionicons name={typePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
            </TouchableOpacity>
            {typePickerOpen && (
              <View style={styles.typeOptions}>
                {INCIDENT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeOption, form.type === t.value && styles.typeOptionSelected]}
                    onPress={() => { setForm(f => ({ ...f, type: t.value })); setTypePickerOpen(false); }}
                  >
                    {form.type === t.value && (
                      <Ionicons name="checkmark" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.typeOptionText, form.type === t.value && { color: '#2563EB', fontWeight: '600' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Description */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Descripción *</Text>
            <TextInput
              style={styles.textarea}
              value={form.description}
              onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
              placeholder="Describe lo que ocurrió…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!form.description.trim() || createMutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={() => createMutation.mutate()}
              disabled={!form.description.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send-outline" size={16} color="#fff" />
              )}
              <Text style={styles.submitBtnText}>
                {createMutation.isPending ? 'Enviando…' : 'Enviar incidencia'}
              </Text>
            </TouchableOpacity>

            {createMutation.isError && (
              <Text style={styles.errorText}>
                Error al enviar. Inténtalo de nuevo.
              </Text>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#94A3B8', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#334155', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: '#94A3B8' },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  cardType: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 6 },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  resolutionText: { fontSize: 12, color: '#059669', flex: 1 },
  cardDate: { fontSize: 11, color: '#94A3B8' },

  // Modal
  modal: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  modalCloseBtn: { padding: 4 },
  modalBody: { flex: 1, padding: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },

  typePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  typePickerText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  typeOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  typeOptionSelected: { backgroundColor: '#EFF6FF' },
  typeOptionText: { fontSize: 14, color: '#334155' },

  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#334155',
    minHeight: 100,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#DC2626', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
