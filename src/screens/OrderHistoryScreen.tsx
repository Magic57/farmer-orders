import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { DateRangePickerModal } from '../components/DateRangePickerModal';
import { theme } from '../constants/theme';

export const OrderHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'formed'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [rangeModalVisible, setRangeModalVisible] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const loadOrders = async () => {
    const list = await StorageService.getOrders();
    setOrders(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return { label: 'ЗАВЕРШЕН', bg: '#D8F3DC', color: '#2D6A4F' };
      case 'in_progress':
        return { label: 'В РАБОТЕ', bg: '#FFE8D6', color: '#D47A22' };
      case 'formed':
      default:
        return { label: 'СФОРМИРОВАН', bg: '#E2EAFc', color: '#3A5A9F' };
    }
  };

  const formatTimestampToYMD = (ts: number) => {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const filteredOrders = orders.filter((o) => {
    // Фильтр по статусу
    if (filter !== 'all' && o.status !== filter) {
      return false;
    }

    // Фильтр по дате завершения
    if (startDate && endDate) {
      // Дата завершения (если есть completedAt, иначе fallback на createdAt если завершен)
      const completionTime = o.completedAt || (o.status === 'completed' ? o.createdAt : null);
      if (!completionTime) return false;

      const orderYMD = formatTimestampToYMD(completionTime);
      if (orderYMD < startDate || orderYMD > endDate) {
        return false;
      }
    }

    return true;
  });

  const totalSumFiltered = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const formatRangeLabel = () => {
    if (!startDate) return '📅 Фильтр по дате завершения';
    const s = startDate.split('-').reverse().join('.');
    const e = endDate ? endDate.split('-').reverse().join('.') : s;
    return `📅 С ${s} по ${e} ✕`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>История заказов</Text>
          <Text style={styles.summaryText}>
            {filteredOrders.length} заказов • {totalSumFiltered.toFixed(2)} ₽
          </Text>
        </View>

        {/* Кнопка фильтра диапазона дат */}
        <TouchableOpacity
          style={[styles.rangeBtn, !!startDate && styles.rangeBtnActive]}
          onPress={() => {
            if (startDate) {
              setStartDate('');
              setEndDate('');
            } else {
              setRangeModalVisible(true);
            }
          }}
        >
          <Text style={[styles.rangeBtnText, !!startDate && styles.rangeBtnTextActive]}>
            {formatRangeLabel()}
          </Text>
        </TouchableOpacity>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Все</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'completed' && styles.filterBtnActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>Завершенные</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'formed' && styles.filterBtnActive]}
            onPress={() => setFilter('formed')}
          >
            <Text style={[styles.filterText, filter === 'formed' && styles.filterTextActive]}>Сформированные</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Заказов не найдено</Text>
          <Text style={styles.emptySubtitle}>
            {startDate
              ? 'В выбранном диапазоне дат нет завершенных заказов. Попробуйте сбросить фильтр дат.'
              : filter === 'completed'
              ? 'Завершенные заказы появятся здесь после доставки.'
              : 'Оформите заказ на вкладке «Новый заказ».'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                {item.completedAt ? (
                  <Text style={styles.completedDateText}>
                    ✅ Завершен: {formatDate(item.completedAt)}
                  </Text>
                ) : (
                  <Text style={styles.date}>Создан: {formatDate(item.createdAt)}</Text>
                )}

                {item.deliveryDate ? (
                  <Text style={styles.deliveryDateText}>
                    📅 Доставка: {item.deliveryDate.split('-').reverse().join('.')}
                  </Text>
                ) : null}

                {item.deliveryAddress ? (
                  <Text style={styles.address} numberOfLines={1}>
                    📍 {item.deliveryAddress}
                  </Text>
                ) : null}

                <View style={styles.cardBottom}>
                  <Text style={styles.itemsCount}>Позиций: {item.items.length}</Text>
                  <Text style={styles.amount}>{item.totalAmount.toFixed(2)} ₽</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <DateRangePickerModal
        visible={rangeModalVisible}
        startDate={startDate}
        endDate={endDate}
        onApplyRange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        onClear={() => {
          setStartDate('');
          setEndDate('');
        }}
        onClose={() => setRangeModalVisible(false)}
      />
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  rangeBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
    alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: theme.colors.primary,
  },
  rangeBtnText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  rangeBtnTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: '#F0ECE1',
    marginRight: 6,
  },
  filterBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  list: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  completedDateText: {
    fontSize: 12,
    color: '#2D6A4F',
    fontWeight: '600',
    marginBottom: 4,
  },
  deliveryDateText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F0ECE1',
    paddingTop: 8,
    marginTop: 4,
  },
  itemsCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
