import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Order, OrderItem, Product, Customer } from '../types';
import { StorageService } from '../services/storage';
import { OrderItemCard } from '../components/OrderItemCard';
import { SelectProductModal } from '../components/SelectProductModal';
import { SelectCustomerModal } from '../components/SelectCustomerModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const EditOrderScreen = () => {
  const { user } = useAuth();
  const isPicker = user?.role === 'picker';
  const route = useRoute<any>();
  const navigation = useNavigation();
  const orderId = route.params?.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [comment, setComment] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  useEffect(() => {
    loadOrder();
    const unsubProducts = StorageService.subscribeProducts(user?.farmId || '', setCatalog);
    const unsubCustomers = StorageService.subscribeCustomers(user?.farmId || '', setCustomers);
    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [orderId, user?.farmId]);

  const loadOrder = async () => {
    if (!orderId) return;
    const data = await StorageService.getOrderById(orderId);
    if (data) {
      setOrder(data);
      setCustomerName(data.customerName);
      setCustomerPhone(data.customerPhone);
      setDeliveryAddress(data.deliveryAddress);
      setDeliveryDate(data.deliveryDate || '');
      setComment(data.comment || '');
      setItems(data.items);
    }
  };

  const loadCatalog = async () => {
    const products = await StorageService.getProducts();
    setCatalog(products);
  };

  const loadCustomers = async () => {
    const list = await StorageService.getCustomers();
    setCustomers(list);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setDeliveryAddress(customer.address);
  };

  const handleSaveCustomer = async (updated: Customer) => {
    await StorageService.saveCustomer(updated, user?.farmId);
    loadCustomers();
    if (customerName === updated.name) {
      setCustomerPhone(updated.phone);
      setDeliveryAddress(updated.address);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    Alert.alert('Удаление', 'Удалить этого заказчика из списка постоянных?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await StorageService.deleteCustomer(id);
          loadCustomers();
        },
      },
    ]);
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      Alert.alert('Товар уже в заказе', 'Отредактируйте его количество в списке.');
      return;
    }

    const isKg = product.unit === 'kg';
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      pricePerUnit: product.pricePerUnit,
      piecesCount: 1,
      actualWeight: 0,
      quantity: isKg ? 0 : 1,
      totalPrice: isKg ? 0 : product.pricePerUnit,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, updated: { piecesCount?: number; actualWeight?: number; quantity: number; totalPrice: number }) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updated,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalOrderAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const handleSaveChanges = async () => {
    if (!isPicker && !customerName.trim()) {
      Alert.alert('Ошибка', 'Введите имя заказчика');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Ошибка', 'В заказе должен быть хотя бы один товар');
      return;
    }

    try {
      if (!isPicker) {
        // Ищем, есть ли уже такой заказчик в постоянных клиентах
        const existingCustomer =
          customers.find((c) => c.id === selectedCustomerId) ||
          customers.find(
            (c) =>
              (c.name.trim().toLowerCase() === customerName.trim().toLowerCase()) ||
              (customerPhone.trim() && c.phone && c.phone.trim() === customerPhone.trim())
          );

        // Сохраняем/обновляем в постоянных клиентах без дублирования
        const customerToSave: Customer = {
          id: existingCustomer ? existingCustomer.id : Date.now().toString(),
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: deliveryAddress.trim(),
          farmId: user?.farmId || '',
          createdAt: existingCustomer?.createdAt || Date.now(),
        };
        await StorageService.saveCustomer(customerToSave, user?.farmId);
      }

      const updatedOrder: Order = {
        id: orderId,
        customerName: isPicker ? (order?.customerName || customerName) : customerName.trim(),
        customerPhone: isPicker ? (order?.customerPhone || customerPhone) : customerPhone.trim(),
        deliveryAddress: isPicker ? (order?.deliveryAddress || deliveryAddress) : deliveryAddress.trim(),
        deliveryDate: isPicker ? order?.deliveryDate : (deliveryDate || undefined),
        comment: isPicker ? order?.comment : (comment.trim() || undefined),
        items,
        totalAmount: parseFloat(totalOrderAmount.toFixed(2)),
        status: order?.status || 'formed',
        farmId: user?.farmId || '',
        createdAt: order?.createdAt || Date.now(),
      };

      await StorageService.saveOrder(updatedOrder, user?.farmId);
      Alert.alert('Готово', 'Изменения в заказе сохранены!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      console.error('Ошибка сохранения заказа:', e);
      Alert.alert('Ошибка сохранения', e.message || 'Не удалось сохранить заказ.');
    }
  };

  const handleDeleteOrder = () => {
    Alert.alert('Удаление заказа', 'Удалить этот заказ без возможности восстановления?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await StorageService.deleteOrder(orderId);
          navigation.goBack();
        },
      },
    ]);
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return 'Выберите дату доставки 📅';
    const [year, month, day] = d.split('-');
    return `📅 Дата доставки: ${day}.${month}.${year}`;
  };

  if (!order) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Загрузка данных заказа...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!isPicker && (
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>Статус заказа:</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBtn, (order?.status || 'formed') === 'formed' && styles.statusBtnActiveFormed]}
              onPress={async () => {
                await StorageService.updateOrderStatus(orderId, 'formed');
                setOrder((prev) => prev ? { ...prev, status: 'formed' } : null);
              }}
            >
              <Text style={[styles.statusBtnText, (order?.status || 'formed') === 'formed' && styles.statusBtnTextActive]}>
                Сформирован
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, order?.status === 'assembling' && styles.statusBtnActiveAssembling]}
              onPress={async () => {
                await StorageService.updateOrderStatus(orderId, 'assembling');
                setOrder((prev) => prev ? { ...prev, status: 'assembling' } : null);
              }}
            >
              <Text style={[styles.statusBtnText, order?.status === 'assembling' && styles.statusBtnTextActive]}>
                В сборке
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, order?.status === 'assembled' && styles.statusBtnActiveAssembled]}
              onPress={async () => {
                await StorageService.updateOrderStatus(orderId, 'assembled');
                setOrder((prev) => prev ? { ...prev, status: 'assembled' } : null);
              }}
            >
              <Text style={[styles.statusBtnText, order?.status === 'assembled' && styles.statusBtnTextActive]}>
                Собран
              </Text>
            </TouchableOpacity>

            {order?.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.statusBtn, styles.statusBtnActiveProgress]}
                onPress={async () => {
                  await StorageService.updateOrderStatus(orderId, 'in_progress');
                  setOrder((prev) => prev ? { ...prev, status: 'in_progress' } : null);
                }}
              >
                <Text style={[styles.statusBtnText, styles.statusBtnTextActive]}>
                  В работе
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.statusBtn, order?.status === 'cancelled' && styles.statusBtnActiveCancelled]}
              onPress={async () => {
                await StorageService.updateOrderStatus(orderId, 'cancelled');
                setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : null);
              }}
            >
              <Text style={[styles.statusBtnText, order?.status === 'cancelled' && styles.statusBtnTextActive]}>
                Отказ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, order?.status === 'completed' && styles.statusBtnActiveCompleted]}
              onPress={async () => {
                await StorageService.updateOrderStatus(orderId, 'completed');
                setOrder((prev) => prev ? { ...prev, status: 'completed' } : null);
              }}
            >
              <Text style={[styles.statusBtnText, order?.status === 'completed' && styles.statusBtnTextActive]}>
                Завершен
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.customerHeader}>
        <Text style={styles.sectionTitle}>Контакты заказчика</Text>
        {!isPicker && (
          <TouchableOpacity
            style={styles.chooseCustomerBtn}
            onPress={() => setCustomerModalVisible(true)}
          >
            <Text style={styles.chooseCustomerBtnText}>👥 Выбрать из списка</Text>
          </TouchableOpacity>
        )}
      </View>

      {isPicker ? (
        <View style={styles.readOnlyCustomerCard}>
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>👤 Заказчик:</Text>
            <Text style={styles.readOnlyValue}>{customerName || 'Не указан'}</Text>
          </View>
          {customerPhone ? (
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>📞 Телефон:</Text>
              <Text style={styles.readOnlyValue}>{customerPhone}</Text>
            </View>
          ) : null}
          {deliveryAddress ? (
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>📍 Адрес:</Text>
              <Text style={styles.readOnlyValue}>{deliveryAddress}</Text>
            </View>
          ) : null}
          {deliveryDate ? (
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>📅 Доставка:</Text>
              <Text style={styles.readOnlyValue}>{deliveryDate.split('-').reverse().join('.')}</Text>
            </View>
          ) : null}
          {comment ? (
            <View style={styles.readOnlyRow}>
              <Text style={styles.readOnlyLabel}>💬 Комментарий:</Text>
              <Text style={styles.readOnlyValue}>{comment}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Имя заказчика *"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Номер телефона"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Адрес доставки"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setDateModalVisible(true)}
          >
            <Text style={[styles.datePickerText, !!deliveryDate && styles.datePickerTextActive]}>
              {formatDisplayDate(deliveryDate)}
            </Text>
          </TouchableOpacity>

          {/* Опциональное поле комментария к заказу */}
          <TextInput
            style={[styles.input, { minHeight: 46 }]}
            placeholder="Комментарий к заказу (опционально, напр: подъезд 2, домофон 45)"
            value={comment}
            onChangeText={setComment}
            multiline
          />
        </>
      )}

      <View style={styles.itemsHeader}>
        <Text style={styles.sectionTitle}>Позиции в заказе ({items.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setProductModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Добавить товар</Text>
        </TouchableOpacity>
      </View>

      {items.map((item) => (
        <OrderItemCard
          key={item.id}
          item={item}
          showWeightInput={true} // При редактировании и работе доступен ввод точного веса
          onUpdateItem={(upd) => handleUpdateItem(item.id, upd)}
          onRemove={() => handleRemoveItem(item.id)}
        />
      ))}

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Сумма заказа:</Text>
        <Text style={styles.totalValue}>{totalOrderAmount.toFixed(2)} ₽</Text>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSaveChanges}>
        <Text style={styles.submitBtnText}>Сохранить изменения</Text>
      </TouchableOpacity>

      {!isPicker && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteOrder}>
          <Text style={styles.deleteBtnText}>Удалить весь заказ</Text>
        </TouchableOpacity>
      )}

      <SelectProductModal
        visible={productModalVisible}
        products={catalog}
        onSelect={handleAddProduct}
        onClose={() => setProductModalVisible(false)}
      />

      <SelectCustomerModal
        visible={customerModalVisible}
        customers={customers}
        onSelect={handleSelectCustomer}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onClose={() => setCustomerModalVisible(false)}
      />

      <DatePickerModal
        visible={dateModalVisible}
        selectedDate={deliveryDate}
        onSelectDate={setDeliveryDate}
        onClose={() => setDateModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 8,
  },
  chooseCustomerBtn: {
    backgroundColor: '#F3E9D2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chooseCustomerBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  readOnlyCustomerCard: {
    backgroundColor: '#F5F0E6',
    borderRadius: theme.radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2DAC8',
    marginBottom: 10,
  },
  readOnlyRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  readOnlyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5E4D',
    width: 130,
  },
  readOnlyValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  input: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  datePickerBtn: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    marginBottom: 8,
  },
  datePickerText: {
    fontSize: 15,
    color: theme.colors.textMuted,
  },
  datePickerTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  addBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    padding: 16,
    borderRadius: theme.radius.md,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteBtn: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: theme.colors.danger,
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: theme.colors.cardBg,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textMain,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
  },
  statusBtnActiveFormed: {
    backgroundColor: '#3A5A9F',
  },
  statusBtnActiveAssembling: {
    backgroundColor: '#D47A22',
  },
  statusBtnActiveAssembled: {
    backgroundColor: '#0C5460',
  },
  statusBtnActiveProgress: {
    backgroundColor: '#6F42C1',
  },
  statusBtnActiveCompleted: {
    backgroundColor: '#2D6A4F',
  },
  statusBtnActiveCancelled: {
    backgroundColor: '#DC3545',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  statusBtnTextActive: {
    color: theme.colors.white,
  },
});
