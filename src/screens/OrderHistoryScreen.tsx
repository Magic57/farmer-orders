import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { DateRangePickerModal } from '../components/DateRangePickerModal';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const OrderHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'formed'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = StorageService.subscribeOrders(user?.farmId || '', (list) => {
      setOrders(list);
    });
    return unsubscribe;
  }, [user?.farmId]);

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

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Снять выбор со всех отфильтрованных
      const filteredIds = new Set(filteredOrders.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Выбрать все отфильтрованные
      const newSelected = new Set([...selectedOrderIds, ...filteredOrders.map((o) => o.id)]);
      setSelectedOrderIds(Array.from(newSelected));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrderIds.length === 0) return;

    const count = selectedOrderIds.length;
    Alert.alert(
      'Удаление заказов',
      `Вы действительно хотите удалить выбранные заказы (${count} шт.)? Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: `Удалить (${count})`,
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await StorageService.deleteOrdersBatch(selectedOrderIds);
              setSelectedOrderIds([]);
            } catch (err) {
              console.error(err);
              Alert.alert('Ошибка', 'Не удалось удалить выбранные заказы');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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

        {/* Панель массовых действий с заказами */}
        {filteredOrders.length > 0 && (
          <View style={styles.batchBar}>
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={handleToggleSelectAll}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isAllSelected && styles.checkboxActive]}>
                {isAllSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.selectAllText}>
                {isAllSelected ? 'Снять выделение' : 'Выбрать все'}
              </Text>
            </TouchableOpacity>

            {selectedOrderIds.length > 0 && (
              <TouchableOpacity
                style={[styles.deleteBatchBtn, isDeleting && styles.deleteBatchBtnDisabled]}
                onPress={handleDeleteSelected}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteBatchText}>
                    🗑 Удалить ({selectedOrderIds.length})
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
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
            const isSelected = selectedOrderIds.includes(item.id);

            return (
              <View style={[styles.card, isSelected && styles.cardSelected]}>
                <View style={styles.cardHeaderRow}>
                  {/* Чек-бокс выбора заказа */}
                  <TouchableOpacity
                    style={styles.cardCheckboxTouchable}
                    onPress={() => toggleSelectOrder(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>

                  {/* Заголовок карточки заказчика */}
                  <TouchableOpacity
                    style={styles.cardTitleTouchable}
                    onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.customerName}>{item.customerName}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Основное тело карточки */}
                <TouchableOpacity
                  style={styles.cardBodyTouchable}
                  onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
                  activeOpacity={0.8}
                >
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

                  {item.comment ? (
                    <Text style={styles.commentText} numberOfLines={2}>
                      💬 {item.comment}
                    </Text>
                  ) : null}

                  <View style={styles.cardBottom}>
                    <Text style={styles.itemsCount}>Позиций: {item.items.length}</Text>
                    <Text style={styles.amount}>{item.totalAmount.toFixed(2)} ₽</Text>
                  </View>
                </TouchableOpacity>
              </View>
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
  batchBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#ECE7DC',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMain,
    marginLeft: 8,
  },
  deleteBatchBtn: {
    backgroundColor: '#D9534F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteBatchBtnDisabled: {
    opacity: 0.6,
  },
  deleteBatchText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B0A795',
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
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
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F7FAF7',
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCheckboxTouchable: {
    marginRight: 10,
    padding: 2,
  },
  cardTitleTouchable: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBodyTouchable: {
    paddingLeft: 34, // Отступ, выравнивающий текст по названию заказчика
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
  commentText: {
    fontSize: 13,
    color: '#5D4037',
    backgroundColor: '#FFFDE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
    fontStyle: 'italic',
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
