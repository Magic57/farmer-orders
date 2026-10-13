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
import { theme } from '../constants/theme';

export const NewOrderScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  useEffect(() => {
    loadCatalog();
    loadCustomers();
  }, [productModalVisible, customerModalVisible]);

  const loadCatalog = async () => {
    const products = await StorageService.getProducts();
    setCatalog(products);
  };

  const loadCustomers = async () => {
    const list = await StorageService.getCustomers();
    setCustomers(list);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setDeliveryAddress(customer.address);
  };

  const handleSaveCustomer = async (updated: Customer) => {
    await StorageService.saveCustomer(updated);
    loadCustomers();
    // Если редактировали выбранного сейчас клиента, обновим и в полях
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

    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      pricePerUnit: product.pricePerUnit,
      quantity: 1,
      totalPrice: product.pricePerUnit * 1,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            quantity: qty,
            totalPrice: parseFloat((qty * item.pricePerUnit).toFixed(2)),
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

    // Сохраняем заказчика в базу постоянных клиентов
    const customerToSave: Customer = {
      id: Date.now().toString(),
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: deliveryAddress.trim(),
      createdAt: Date.now(),
    };
    await StorageService.saveCustomer(customerToSave);

    const newOrder: Order = {
      id: Date.now().toString(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items,
      totalAmount: parseFloat(totalOrderAmount.toFixed(2)),
      status: 'formed',
      createdAt: Date.now(),
    };

    await StorageService.saveOrder(newOrder);
    Alert.alert('Успешно', 'Заказ сохранен!', [
      {
        text: 'OK',
        onPress: () => {
          setCustomerName('');
          setCustomerPhone('');
          setDeliveryAddress('');
          setItems([]);
        },
      },
    ]);
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
            onUpdateQuantity={(qty) => handleUpdateQuantity(item.id, qty)}
            onRemove={() => handleRemoveItem(item.id)}
          />
        ))
      )}

      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>Итого к оплате:</Text>
        <Text style={styles.totalValue}>{totalOrderAmount.toFixed(2)} ₽</Text>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSaveOrder}>
        <Text style={styles.submitBtnText}>Сохранить заказ</Text>
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
});
