import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido cambiada. Vuelve a iniciar sesión.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al cambiar la contraseña';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#334155" />
      </TouchableOpacity>

      <View style={styles.headerArea}>
        <View style={styles.iconBox}>
          <Ionicons name="lock-closed-outline" size={28} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Cambiar contraseña</Text>
        <Text style={styles.subtitle}>Introduce tu contraseña actual y la nueva</Text>
      </View>

      <View style={styles.form}>
        {/* Current password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Contraseña actual</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={form.currentPassword}
              onChangeText={(v) => setForm(f => ({ ...f, currentPassword: v }))}
              secureTextEntry={!show.current}
              placeholder="Tu contraseña actual"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShow(s => ({ ...s, current: !s.current }))}>
              <Ionicons name={show.current ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* New password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nueva contraseña</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={form.newPassword}
              onChangeText={(v) => setForm(f => ({ ...f, newPassword: v }))}
              secureTextEntry={!show.newPw}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShow(s => ({ ...s, newPw: !s.newPw }))}>
              <Ionicons name={show.newPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {/* Strength indicator */}
          {form.newPassword.length > 0 && (
            <View style={styles.strength}>
              {[4, 8, 12].map((threshold, i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    form.newPassword.length >= threshold
                      ? i === 0 ? styles.strengthWeak
                      : i === 1 ? styles.strengthMedium
                      : styles.strengthStrong
                      : styles.strengthEmpty,
                  ]}
                />
              ))}
              <Text style={styles.strengthLabel}>
                {form.newPassword.length < 4 ? 'Muy corta'
                  : form.newPassword.length < 8 ? 'Corta'
                  : form.newPassword.length < 12 ? 'Media'
                  : 'Fuerte'}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={form.confirmPassword}
              onChangeText={(v) => setForm(f => ({ ...f, confirmPassword: v }))}
              secureTextEntry={!show.confirm}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShow(s => ({ ...s, confirm: !s.confirm }))}>
              <Ionicons name={show.confirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          {form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword && (
            <Text style={styles.mismatch}>Las contraseñas no coinciden</Text>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
          }
          <Text style={styles.btnText}>
            {loading ? 'Cambiando…' : 'Cambiar contraseña'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20 },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  headerArea: { alignItems: 'center', marginBottom: 28 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: '#334155' },

  strength: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  strengthBar: { height: 4, flex: 1, borderRadius: 2 },
  strengthEmpty: { backgroundColor: '#E2E8F0' },
  strengthWeak: { backgroundColor: '#EF4444' },
  strengthMedium: { backgroundColor: '#F59E0B' },
  strengthStrong: { backgroundColor: '#10B981' },
  strengthLabel: { fontSize: 11, color: '#64748B', marginLeft: 4 },

  mismatch: { fontSize: 11, color: '#EF4444', marginTop: 4 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
