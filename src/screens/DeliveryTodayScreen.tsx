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
  Linking,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Order, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const DeliveryTodayScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [formedOrders, setFormedOrders] = useState<Order[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [prepModalVisible, setPrepModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = StorageService.subscribeOrders(user?.farmId || '', (all) => {
      setActiveOrders(all.filter((o) => o.status === 'in_progress'));
      setFormedOrders(all.filter((o) => o.status === 'formed'));
    });
    return unsubscribe;
  }, [user?.farmId]);

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

  // Экспорт заказов в файл для мессенджера
  const handleExportOrders = async () => {
    if (activeOrders.length === 0) {
      Alert.alert('Экспорт', 'Сначала добавьте заказы на развозку.');
      return;
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const fileName = `razvozka_${todayStr}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const payload = {
        exportDate: todayStr,
        version: '1.0',
        orders: activeOrders,
      };

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Отправить заказы на сборку',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка экспорта', 'Не удалось экспортировать файл.');
    }
  };

  // Импорт заказов из файла мессенджера на другом телефоне
  const handleImportOrders = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = JSON.parse(content);

      let importedList: Order[] = [];
      if (Array.isArray(parsed)) {
        importedList = parsed;
      } else if (parsed && Array.isArray(parsed.orders)) {
        importedList = parsed.orders;
      }

      if (importedList.length === 0) {
        Alert.alert('Ошибка', 'В выбранном файле нет подходящих заказов.');
        return;
      }

      // Все импортированные заказы автоматически ставим в статус 'in_progress' (развозка)
      const preparedList = importedList.map((o) => ({
        ...o,
        status: 'in_progress' as const,
      }));

      const added = await StorageService.importOrders(preparedList);
      loadData();
      Alert.alert(
        'Успешный импорт! 🎉',
        `Загружено заказов: ${preparedList.length} (новых добавлено: ${added}). Они готовы к сборке!`
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка импорта', 'Не удалось прочитать файл. Убедитесь, что это файл формата .json');
    }
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
          <Text style={styles.addBtnText}>+ Заказ</Text>
        </TouchableOpacity>
      </View>

      {/* Панель экспорта, импорта и листа сборки */}
      <View style={styles.syncBar}>
        <TouchableOpacity style={styles.syncBtn} onPress={handleExportOrders}>
          <Text style={styles.syncBtnText}>📤 Экспорт в мессенджер</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.syncBtn, styles.importBtn]} onPress={handleImportOrders}>
          <Text style={styles.importBtnText}>📥 Импорт файла</Text>
        </TouchableOpacity>

        {activeOrders.length > 0 && (
          <TouchableOpacity style={[styles.syncBtn, styles.prepBtn]} onPress={() => setPrepModalVisible(true)}>
            <Text style={styles.prepBtnText}>📋 Лист сборки</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚚</Text>
          <Text style={styles.emptyTitle}>На сегодня нет заказов в работе</Text>
          <Text style={styles.emptySubtitle}>
            Нажмите «+ Заказ» для добавления из сформированных, либо нажмите «📥 Импорт файла», если коллега прислал список из мессенджера!
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
});
