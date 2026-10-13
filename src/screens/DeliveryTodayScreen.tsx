import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  Linking,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Order, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const DeliveryTodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isDriverMode, setIsDriverMode } = useAuth();

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [formedOrders, setFormedOrders] = useState<Order[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [prepModalVisible, setPrepModalVisible] = useState(false);

  // Тогглер отображается и работает только для роли 'courier' (позволяет развозчику переключаться между простым видом и диспетчерским)
  // Для диспетчера и сборщика всегда false (полный диспетчерский вид)
  const isCourier = user?.role === 'courier';
  const driverMode = isDriverMode;
  const setDriverMode = setIsDriverMode;

  useEffect(() => {
    const unsubscribe = StorageService.subscribeOrders(user?.farmId || '', (all) => {
      setActiveOrders(all.filter((o) => o.status === 'in_progress'));
      setFormedOrders(all.filter((o) => o.status === 'formed'));
    });
    return unsubscribe;
  }, [user?.farmId]);

  const handlePickOrder = async (orderId: string) => {
    await StorageService.updateOrderStatus(orderId, 'in_progress');
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
          },
        },
      ]
    );
  };



  // Сводный перечень продуктов для сборщика (чтобы сразу видеть сколько всего собрать)
  const getPrepSummary = () => {
    const summary: Record<string, { name: string; unit: string; totalPieces: number; totalWeight: number }> = {};
    for (const order of activeOrders) {
      for (const item of order.items) {
        if (!summary[item.productId]) {
          summary[item.productId] = {
            name: item.productName,
            unit: item.unit,
            totalPieces: 0,
            totalWeight: 0,
          };
        }
        if (item.piecesCount) {
          summary[item.productId].totalPieces += item.piecesCount;
        } else if (item.unit === 'piece') {
          summary[item.productId].totalPieces += item.quantity;
        }
        if (item.actualWeight && item.actualWeight > 0) {
          summary[item.productId].totalWeight += item.actualWeight;
        }
      }
    }
    return Object.values(summary);
  };

  const totalDeliverySum = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {driverMode ? 'Маршрут доставки 🚗' : (user?.role === 'picker' ? 'Сборка заказов 📦' : 'Развозка сегодня 🚚')}
          </Text>
          <Text style={styles.subtitle}>
            В работе: {activeOrders.length} | Итого: {totalDeliverySum.toFixed(2)} ₽
          </Text>
        </View>

        {!driverMode && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Заказ</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Тумблер переключения режимов «Диспетчер» / «Развозчик» отображается ТОЛЬКО для роли Развозчик */}
      {isCourier && (
        <View style={styles.modeToggleBar}>
          <TouchableOpacity
            style={[styles.modeToggleTab, !driverMode && styles.modeToggleTabActive]}
            onPress={() => setDriverMode(false)}
          >
            <Text style={[styles.modeToggleText, !driverMode && styles.modeToggleTextActive]}>
              📝 Режим «Диспетчер»
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggleTab, driverMode && styles.modeToggleTabActive]}
            onPress={() => setDriverMode(true)}
          >
            <Text style={[styles.modeToggleText, driverMode && styles.modeToggleTextActive]}>
              🚗 Режим «Развозчик»
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Кнопка листа сборки для заготовки/взвешивания (в режиме диспетчера) */}
      {!driverMode && activeOrders.length > 0 && (
        <View style={styles.syncBar}>
          <TouchableOpacity style={[styles.syncBtn, styles.prepBtn]} onPress={() => setPrepModalVisible(true)}>
            <Text style={styles.prepBtnText}>📋 Лист сборки ({activeOrders.length} заказов)</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚚</Text>
          <Text style={styles.emptyTitle}>На сегодня нет заказов в работе</Text>
          <Text style={styles.emptySubtitle}>
            Нажмите «+ Заказ» вверху экрана, чтобы выбрать нужные заказы из сформированных на сегодняшнюю развозку.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            if (driverMode) {
              // === РЕЖИМ «РАЗВОЗЧИК» (Крупные кнопки, адрес, звонок в 1 тап, доставка) ===
              return (
                <View style={styles.driverCard}>
                  <View style={styles.driverCardHeader}>
                    <Text style={styles.driverOrderNum}>Остановка #{index + 1}</Text>
                    <Text style={styles.driverAmount}>{item.totalAmount.toFixed(0)} ₽</Text>
                  </View>

                  <Text style={styles.driverCustomerName}>{item.customerName}</Text>

                  {/* Крупный адрес доставки */}
                  {item.deliveryAddress ? (
                    <View style={styles.driverAddressBox}>
                      <Text style={styles.driverAddressIcon}>📍</Text>
                      <Text style={styles.driverAddressText}>{item.deliveryAddress}</Text>
                    </View>
                  ) : (
                    <Text style={styles.driverNoAddress}>Адрес не указан (самовывоз/уточнить)</Text>
                  )}

                  {/* Огромная кнопка быстрого звонка клиенту */}
                  {item.customerPhone ? (
                    <TouchableOpacity
                      style={styles.driverCallBtn}
                      onPress={() => Linking.openURL(`tel:${item.customerPhone}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.driverCallBtnIcon}>📞</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.driverCallBtnLabel}>Позвонить клиенту</Text>
                        <Text style={styles.driverCallBtnPhone}>{item.customerPhone}</Text>
                      </View>
                      <Text style={styles.driverCallArrow}>➔</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Краткий перечень того, что отдать */}
                  <View style={styles.driverItemsBox}>
                    <Text style={styles.driverItemsLabel}>Отдать клиенту:</Text>
                    <Text style={styles.driverItemsText}>
                      {item.items.map((i) => {
                        if (i.unit === 'kg') {
                          const w = i.actualWeight && i.actualWeight > 0 ? `${i.actualWeight} кг` : `${i.quantity} кг`;
                          return `• ${i.productName}: ${w}`;
                        }
                        return `• ${i.productName}: ${i.quantity} шт`;
                      }).join('\n')}
                    </Text>
                  </View>

                  {/* Огромная кнопка ДОСТАВЛЕНО */}
                  <TouchableOpacity
                    style={styles.driverCompleteBtn}
                    onPress={() => handleCompleteOrder(item.id, item.customerName)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.driverCompleteBtnText}>✓ ДОСТАВЛЕНО ({item.totalAmount.toFixed(0)} ₽)</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            // === РЕЖИМ «ДИСПЕТЧЕР» (Детальный вид, редактирование, откладывание) ===
            return (
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
                    <TouchableOpacity
                      style={styles.phoneContainer}
                      onPress={() => Linking.openURL(`tel:${item.customerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.phone}>📞 {item.customerPhone}</Text>
                      <Text style={styles.callBadge}>Позвонить</Text>
                    </TouchableOpacity>
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
            );
          }}
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

      {/* Модальное окно Листа сборки для заготовителя/сборщика */}
      <Modal visible={prepModalVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📋 Сводный лист сборки</Text>
            <TouchableOpacity onPress={() => setPrepModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.prepContent}>
            <Text style={styles.prepSubtitle}>
              Сколько всего товаров нужно собрать и передать развозчику:
            </Text>

            {getPrepSummary().map((prod, idx) => (
              <View key={idx} style={styles.prepRow}>
                <Text style={styles.prepProdName}>• {prod.name}</Text>
                <Text style={styles.prepProdQty}>
                  {prod.totalPieces > 0 ? `${prod.totalPieces} шт ` : ''}
                  {prod.totalWeight > 0 ? `(${prod.totalWeight.toFixed(3)} кг)` : ''}
                </Text>
              </View>
            ))}
          </ScrollView>
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
  syncBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  syncBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginRight: 6,
    marginVertical: 2,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  importBtn: {
    backgroundColor: '#E8F5E9',
    borderColor: theme.colors.primary,
  },
  importBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  prepBtn: {
    backgroundColor: '#FFF3E0',
    borderColor: '#E67E22',
  },
  prepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D35400',
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
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF6EC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#D4E7CF',
  },
  phone: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  callBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
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
  prepContent: {
    padding: theme.spacing.md,
  },
  prepSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  prepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    padding: 14,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  prepProdName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    flex: 1,
  },
  prepProdQty: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },

  /* Стили для тумблера режимов */
  modeToggleBar: {
    flexDirection: 'row',
    backgroundColor: '#EBE5D8',
    padding: 4,
    marginHorizontal: theme.spacing.md,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: theme.radius.md,
  },
  modeToggleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  modeToggleTabActive: {
    backgroundColor: theme.colors.cardBg,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  modeToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },

  /* Стили для супер-удобной карточки «Развозчик» за рулем */
  driverCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#D4C3A3',
    elevation: 3,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F0ECE1',
    paddingBottom: 8,
    marginBottom: 8,
  },
  driverOrderNum: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  driverAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  driverCustomerName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textMain,
    marginBottom: 10,
  },
  driverAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F3E5AB',
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 12,
  },
  driverAddressIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  driverAddressText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#5C4018',
    lineHeight: 22,
  },
  driverNoAddress: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  driverCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2D5A27',
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
  },
  driverCallBtnIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  driverCallBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D5A27',
    textTransform: 'uppercase',
  },
  driverCallBtnPhone: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B4316',
    marginTop: 2,
  },
  driverCallArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5A27',
  },
  driverItemsBox: {
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  driverItemsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  driverItemsText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMain,
    lineHeight: 22,
  },
  driverCompleteBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  driverCompleteBtnText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
