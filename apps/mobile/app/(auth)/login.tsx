import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { api, saveTokens } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Introduce email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        deviceInfo: `Expo/${Platform.OS}`,
      });
      await saveTokens(data.accessToken, data.refreshToken, data.user);
      router.replace('/(tabs)/');
    } catch (err: any) {
      Alert.alert(
        'Error de acceso',
        err.response?.data?.message ?? 'Credenciales incorrectas. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Ionicons name="time-outline" size={36} color="white" />
          </View>
          <Text style={styles.title}>Fichaje App</Text>
          <Text style={styles.subtitle}>Control horario profesional</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="tu@empresa.com"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeButton}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginBtnText}>Acceder</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF6FF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 72, height: 72, backgroundColor: '#2563EB',
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, shadowColor: '#2563EB', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: 'white', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden',
  },
  eyeButton: { padding: 14 },
  loginBtn: {
    backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
