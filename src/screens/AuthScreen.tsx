import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { theme } from '../constants/theme';

export const AuthScreen = () => {
  const insets = useSafeAreaInsets();
  const { login, registerNewFarm, registerJoinFarm, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register_new' | 'register_join'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        'Восстановление пароля',
        'Пожалуйста, введите ваш адрес электронной почты (Email) в поле выше, чтобы мы могли отправить ссылку для сброса пароля.'
      );
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email.trim());
      Alert.alert(
        'Письмо отправлено! ✉️',
        `Инструкция по восстановлению пароля отправлена на адрес:\n${email.trim()}\n\nПроверьте почту (включая папку "Спам").`
      );
    } catch (e: any) {
      let msg = e.message || 'Не удалось отправить ссылку';
      if (msg.includes('auth/user-not-found')) msg = 'Пользователь с таким email не найден';
      if (msg.includes('auth/invalid-email')) msg = 'Некорректный email адрес';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register_new') {
        if (!name.trim()) {
          Alert.alert('Ошибка', 'Укажите ваше имя');
          setLoading(false);
          return;
        }
        if (!farmName.trim()) {
          Alert.alert('Ошибка', 'Укажите название вашего хозяйства');
          setLoading(false);
          return;
        }
        await registerNewFarm(email, password, name, farmName, role);
      } else if (mode === 'register_join') {
        if (!name.trim()) {
          Alert.alert('Ошибка', 'Укажите ваше имя');
          setLoading(false);
          return;
        }
        if (!inviteCode.trim()) {
          Alert.alert('Ошибка', 'Введите код приглашения в хозяйство');
          setLoading(false);
          return;
        }
        await registerJoinFarm(email, password, name, inviteCode, role);
      }
    } catch (e: any) {
      let msg = e.message || 'Произошла ошибка при авторизации';
      if (msg.includes('auth/invalid-email')) msg = 'Некорректный email';
      if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential'))
        msg = 'Неверный логин или пароль';
      if (msg.includes('auth/email-already-in-use')) msg = 'Такой email уже зарегистрирован';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20) + 20 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.logoIcon}>🌾</Text>
          <Text style={styles.appTitle}>Фермерские Заказы</Text>
          <Text style={styles.appSubtitle}>
            Единая облачная сеть для хозяйства и команды
          </Text>
        </View>

        {/* Переключатель режимов */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              Вход
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, mode === 'register_new' && styles.tabActive]}
            onPress={() => setMode('register_new')}
          >
            <Text style={[styles.tabText, mode === 'register_new' && styles.tabTextActive]}>
              Создать ферму
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, mode === 'register_join' && styles.tabActive]}
            onPress={() => setMode('register_join')}
          >
            <Text style={[styles.tabText, mode === 'register_join' && styles.tabTextActive]}>
              Войти по коду
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {mode !== 'login' && (
            <>
              <Text style={styles.label}>Ваше имя</Text>
              <TextInput
                style={styles.input}
                placeholder="Иван Петров"
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          {mode === 'register_new' && (
            <>
              <Text style={styles.label}>Название вашего хозяйства / фермы</Text>
              <TextInput
                style={styles.input}
                placeholder="Например: Ферма «Уютная»"
                value={farmName}
                onChangeText={setFarmName}
              />
            </>
          )}

          {mode === 'register_join' && (
            <>
              <Text style={styles.label}>Код приглашения в хозяйство</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="FARM-XXXX"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={setInviteCode}
              />
              <Text style={styles.hint}>
                Узнайте 6-значный код у владельца вашей фермы в профиле приложения.
              </Text>
            </>
          )}

          <Text style={styles.label}>Электронная почта (Email)</Text>
          <TextInput
            style={styles.input}
            placeholder="example@farm.ru"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Пароль</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Минимум 6 символов"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {mode === 'login' && (
            <TouchableOpacity
              style={styles.forgotPassBtn}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPassText}>Забыли пароль?</Text>
            </TouchableOpacity>
          )}

          {mode !== 'login' && (
            <>
              <Text style={styles.label}>Ваша роль в хозяйстве</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, role === 'manager' && styles.roleBtnActive]}
                  onPress={() => setRole('manager')}
                >
                  <Text style={[styles.roleText, role === 'manager' && styles.roleTextActive]}>
                    📝 Диспетчер
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, role === 'picker' && styles.roleBtnActive]}
                  onPress={() => setRole('picker')}
                >
                  <Text style={[styles.roleText, role === 'picker' && styles.roleTextActive]}>
                    📦 Сборщик
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleBtn, role === 'courier' && styles.roleBtnActive]}
                  onPress={() => setRole('courier')}
                >
                  <Text style={[styles.roleText, role === 'courier' && styles.roleTextActive]}>
                    🚚 Развозчик
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'login'
                  ? 'Войти в аккаунт'
                  : mode === 'register_new'
                  ? 'Создать хозяйство и войти'
                  : 'Присоединиться к ферме'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 50,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  appSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#EBE5D8',
    borderRadius: theme.radius.sm,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.cardBg,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 15,
  },
  codeInput: {
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 2,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginBottom: 4,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    marginHorizontal: 2,
  },
  roleBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  roleTextActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginTop: 18,
  },
  submitBtnText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingVertical: 4,
  },
  forgotPassText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
