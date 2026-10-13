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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product, OrderItem, Order, Customer } from '../types';
import { StorageService } from '../services/storage';
import { OrderItemCard } from '../components/OrderItemCard';
import { SelectProductModal } from '../components/SelectProductModal';
import { SelectCustomerModal } from '../components/SelectCustomerModal';
import { DatePickerModal } from '../components/DatePickerModal';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const NewOrderScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
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
    const unsubProducts = StorageService.subscribeProducts(user?.farmId || '', setCatalog);
    const unsubCustomers = StorageService.subscribeCustomers(user?.farmId || '', setCustomers);
    return () => {
      unsubProducts();
      unsubCustomers();
    };
  }, [user?.farmId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setDeliveryAddress(customer.address);
  };

  const handleSaveCustomer = async (updated: Customer) => {
    await StorageService.saveCustomer(updated, user?.farmId);
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
      Alert.alert('Товар уже в корзине', 'Вы можете изменить его количество ниже.');
      return;
    }

    const isKg = product.unit === 'kg';
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      pricePerUnit: product.pricePerUnit,
      piecesCount: 1, // по умолчанию 1 штука
      actualWeight: 0, // вес добавится позже при взвешивании
      quantity: isKg ? 0 : 1, // если кг - расчет веса до взвешивания = 0
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

  const handleSaveOrder = async () => {
    if (!customerName.trim()) {
      Alert.alert('Ошибка', 'Введите имя заказчика');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Ошибка', 'Добавьте хотя бы один товар в заказ');
      return;
    }

    try {
      // Ищем, есть ли уже такой заказчик в списке (по ID или по имени/телефону)
      const existingCustomer =
        customers.find((c) => c.id === selectedCustomerId) ||
        customers.find(
          (c) =>
            (c.name.trim().toLowerCase() === customerName.trim().toLowerCase()) ||
            (customerPhone.trim() && c.phone && c.phone.trim() === customerPhone.trim())
        );

      // Сохраняем/обновляем заказчика в базе постоянных клиентов без дублирования
      const customerToSave: Customer = {
        id: existingCustomer ? existingCustomer.id : Date.now().toString(),
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: deliveryAddress.trim(),
        farmId: user?.farmId || '',
        createdAt: existingCustomer?.createdAt || Date.now(),
      };
      await StorageService.saveCustomer(customerToSave, user?.farmId);

      const newOrder: Order = {
        id: Date.now().toString(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate: deliveryDate || undefined,
        comment: comment.trim() || undefined,
        items,
        totalAmount: parseFloat(totalOrderAmount.toFixed(2)),
        status: 'formed',
        farmId: user?.farmId || '',
        createdAt: Date.now(),
      };

      await StorageService.saveOrder(newOrder, user?.farmId);
      Alert.alert('Успешно 🎉', 'Заказ успешно сформирован!', [
        {
          text: 'OK',
          onPress: () => {
            setSelectedCustomerId(null);
            setCustomerName('');
            setCustomerPhone('');
            setDeliveryAddress('');
            setDeliveryDate('');
            setComment('');
            setItems([]);
          },
        },
      ]);
    } catch (e: any) {
      console.error('Ошибка создания заказа:', e);
      Alert.alert('Ошибка формирования заказа', e.message || 'Не удалось сохранить заказ.');
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return 'Выберите дату доставки 📅';
    const [year, month, day] = d.split('-');
    return `📅 Дата доставки: ${day}.${month}.${year}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
    >
      <View style={styles.customerHeader}>
        <Text style={styles.sectionTitle}>Контакты заказчика</Text>
        <TouchableOpacity
          style={styles.chooseCustomerBtn}
          onPress={() => setCustomerModalVisible(true)}
        >
          <Text style={styles.chooseCustomerBtnText}>👥 Выбрать из списка</Text>
        </TouchableOpacity>
      </View>

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

      {/* Поле даты доставки */}
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

      <View style={styles.itemsHeader}>
        <Text style={styles.sectionTitle}>Товары в заказе ({items.length})</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setProductModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Добавить товар</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyItems}>
          <Text style={styles.emptyItemsText}>Корзина пуста. Добавьте товары из каталога.</Text>
        </View>
      ) : (
        items.map((item) => (
          <OrderItemCard
            key={item.id}
            item={item}
            showWeightInput={false} // На этапе нового заказа указываем штуки, вес - при взятии в работу
            onUpdateItem={(upd) => handleUpdateItem(item.id, upd)}
            onRemove={() => handleRemoveItem(item.id)}
          />
        ))
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Предварительная сумма:</Text>
        <Text style={styles.totalValue}>{totalOrderAmount.toFixed(2)} ₽</Text>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSaveOrder}>
        <Text style={styles.submitBtnText}>Сформировать заказ</Text>
      </TouchableOpacity>

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
    marginTop: 14,
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
  emptyItems: {
    padding: 20,
    backgroundColor: '#F5EFE0',
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyItemsText: {
    color: theme.colors.textMuted,
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textMain,
  },
  totalValue: {
    fontSize: 20,
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
});
