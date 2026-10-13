import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, logout, changeRole } = useAuth();

  const handleShareCode = async () => {
    if (!user?.inviteCode) return;
    try {
      await Share.share({
        message: `Присоединяйся к нашему хозяйству "${user.farmName}" в приложении "Фермерские Заказы"! Введи код приглашения: ${user.inviteCode}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы действительно хотите выйти из аккаунта?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'manager':
        return '📝 Диспетчер (прием заказов)';
      case 'picker':
        return '📦 Сборщик / Заготовщик на ферме';
      case 'courier':
        return '🚚 Развозчик заказов';
      default:
        return 'Участник хозяйства';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Text style={styles.title}>Мой профиль и Хозяйство</Text>
      </View>

      <View style={styles.content}>
        {/* Карточка фермы */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>🏡 Ваше хозяйство</Text>
          <Text style={styles.farmName}>{user?.farmName || 'Фермерское хозяйство'}</Text>

          <View style={styles.codeBlock}>
            <View>
              <Text style={styles.codeLabel}>Код для подключения сотрудников:</Text>
              <Text style={styles.codeValue}>{user?.inviteCode}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareCode}>
              <Text style={styles.shareBtnText}>Поделиться 📤</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>
            Отправьте этот код сборщику или развозчику, чтобы они вошли в общее хозяйство со своих смартфонов.
          </Text>
        </View>

        {/* Карточка пользователя и роли */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>👤 Данные и текущая роль</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Имя:</Text>
            <Text style={styles.val}>{user?.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.val}>{user?.email}</Text>
          </View>

          <Text style={[styles.cardSectionTitle, { marginTop: 14, marginBottom: 8 }]}>
            🔄 Быстрое переключение роли:
          </Text>
          <View style={styles.roleButtonsRow}>
            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                user?.role === 'manager' && styles.roleSwitchBtnActive,
              ]}
              onPress={() => changeRole('manager')}
            >
              <Text
                style={[
                  styles.roleSwitchText,
                  user?.role === 'manager' && styles.roleSwitchTextActive,
                ]}
              >
                📝 Диспетчер
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                user?.role === 'courier' && styles.roleSwitchBtnActive,
              ]}
              onPress={() => changeRole('courier')}
            >
              <Text
                style={[
                  styles.roleSwitchText,
                  user?.role === 'courier' && styles.roleSwitchTextActive,
                ]}
              >
                🚚 Развозчик
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleSwitchBtn,
                user?.role === 'picker' && styles.roleSwitchBtnActive,
              ]}
              onPress={() => changeRole('picker')}
            >
              <Text
                style={[
                  styles.roleSwitchText,
                  user?.role === 'picker' && styles.roleSwitchTextActive,
                ]}
              >
                📦 Сборщик
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  content: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  farmName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  codeBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 4,
  },
  codeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 2,
    marginTop: 2,
  },
  shareBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  shareBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  codeHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#F0ECE1',
  },
  label: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  val: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  roleVal: {
    color: theme.colors.primary,
  },
  logoutBtn: {
    marginTop: 10,
    backgroundColor: '#FDE8E8',
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8B4B4',
  },
  logoutBtnText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
  roleButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  roleSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 3,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  roleSwitchBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: theme.colors.primary,
  },
  roleSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  roleSwitchTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
});
