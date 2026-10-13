import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { theme } from '../constants/theme';

export const DeliveryTodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [formedOrders, setFormedOrders] = useState<Order[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const loadData = async () => {
    const all = await StorageService.getOrders();
    // Заказы "в работе" (на развозку сегодня)
    setActiveOrders(all.filter((o) => o.status === 'in_progress'));
    // Заказы со статусом "сформирован" (доступные для выбора на развозку)
    setFormedOrders(all.filter((o) => o.status === 'formed'));
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handlePickOrder = async (orderId: string) => {
    await StorageService.updateOrderStatus(orderId, 'in_progress');
    loadData();
  };

  const handleCompleteOrder = (orderId: string, customerName: string) => {
    Alert.alert(
      'Завершение заказа',
      `Заказ для "${customerName}" доставлен? Он будет перенесен в Историю.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Да, завершить',
          style: 'default',
          onPress: async () => {
            await StorageService.updateOrderStatus(orderId, 'completed');
            loadData();
          },
        },
      ]
    );
  };

  const handleReturnToFormed = async (orderId: string) => {
    Alert.alert(
      'Снять с развозки',
      'Вернуть заказ в статус "Сформирован"?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Вернуть',
          style: 'default',
          onPress: async () => {
            await StorageService.updateOrderStatus(orderId, 'formed');
            loadData();
          },
        },
      ]
    );
  };

  const totalDeliverySum = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View>
          <Text style={styles.title}>Развозка сегодня 🚚</Text>
          <Text style={styles.subtitle}>
            В работе: {activeOrders.length} | Итого: {totalDeliverySum.toFixed(2)} ₽
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Выбрать заказ</Text>
        </TouchableOpacity>
      </View>

      {activeOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚚</Text>
          <Text style={styles.emptyTitle}>На сегодня нет заказов в работе</Text>
          <Text style={styles.emptySubtitle}>
            Нажмите «+ Выбрать заказ», чтобы добавить сформированные заказы в сегодняшний маршрут.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditOrder', { orderId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.orderNumber}>#{index + 1} {item.customerName}</Text>
                  <Text style={styles.statusBadge}>В РАБОТЕ</Text>
                </View>

                {item.customerPhone ? (
                  <Text style={styles.phone}>📞 {item.customerPhone}</Text>
                ) : null}

                {item.deliveryDate ? (
                  <Text style={styles.deliveryDateText}>
                    📅 Доставка: {item.deliveryDate.split('-').reverse().join('.')}
                  </Text>
                ) : null}

                {item.deliveryAddress ? (
                  <Text style={styles.address}>📍 {item.deliveryAddress}</Text>
                ) : null}

                <View style={styles.itemsSummary}>
                  <Text style={styles.itemsListText} numberOfLines={2}>
                    {item.items.map((i) => {
                      if (i.unit === 'kg') {
                        const pieces = i.piecesCount ? `${i.piecesCount} шт` : '';
                        const weight = i.actualWeight && i.actualWeight > 0 ? `${i.actualWeight} кг` : 'вес не указан';
                        return `${i.productName} (${pieces ? pieces + ', ' : ''}${weight})`;
                      }
                      return `${i.productName} (${i.quantity} шт)`;
                    }).join(', ')}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>К оплате:</Text>
                  <Text style={styles.amountValue}>{item.totalAmount.toFixed(2)} ₽</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.returnBtn}
                  onPress={() => handleReturnToFormed(item.id)}
                >
                  <Text style={styles.returnBtnText}>Отложить</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => handleCompleteOrder(item.id, item.customerName)}
                >
                  <Text style={styles.completeBtnText}>✓ Завершен</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Модальное окно выбора из сформированных заказов */}
      <Modal visible={addModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Сформированные заказы</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>

          {formedOrders.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Нет доступных заказов</Text>
              <Text style={styles.emptySubtitle}>
                Все заказы либо уже взяты в работу, либо завершены. Создайте новый заказ во вкладке «Новый заказ».
              </Text>
            </View>
          ) : (
            <FlatList
              data={formedOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.modalCard}>
                  <View style={styles.modalCardInfo}>
                    <Text style={styles.modalCustomerName}>{item.customerName}</Text>
                    {item.deliveryAddress ? (
                      <Text style={styles.modalAddress} numberOfLines={1}>
                        📍 {item.deliveryAddress}
                      </Text>
                    ) : null}
                    <Text style={styles.modalAmount}>
                      {item.items.length} поз. • {item.totalAmount.toFixed(2)} ₽
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.pickBtn}
                    onPress={() => {
                      handlePickOrder(item.id);
                      setAddModalVisible(false);
                    }}
                  >
                    <Text style={styles.pickBtnText}>В работу</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  addBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  list: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  statusBadge: {
    backgroundColor: '#FFE8D6',
    color: '#D47A22',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deliveryDateText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  itemsSummary: {
    backgroundColor: '#FAF8F5',
    padding: 8,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
  },
  itemsListText: {
    fontSize: 13,
    color: theme.colors.textMain,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#F0ECE1',
    paddingTop: 10,
    marginTop: 8,
  },
  returnBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: '#EBE5D8',
  },
  returnBtnText: {
    color: theme.colors.textMain,
    fontSize: 13,
    fontWeight: '600',
  },
  completeBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  completeBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 10,
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
    lineHeight: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCardInfo: {
    flex: 1,
    paddingRight: 8,
  },
  modalCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    marginBottom: 2,
  },
  modalAddress: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  modalAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  pickBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  pickBtnText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
