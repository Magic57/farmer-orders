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
import { Product, OrderItem, Order } from '../types';
import { StorageService } from '../services/storage';
import { OrderItemCard } from '../components/OrderItemCard';
import { SelectProductModal } from '../components/SelectProductModal';
import { theme } from '../constants/theme';

export const NewOrderScreen = () => {
  const navigation = useNavigation();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, [modalVisible]);

  const loadCatalog = async () => {
    const products = await StorageService.getProducts();
    setCatalog(products);
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

    const newOrder: Order = {
      id: Date.now().toString(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items,
      totalAmount: parseFloat(totalOrderAmount.toFixed(2)),
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Контакты заказчика</Text>
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
          onPress={() => setModalVisible(true)}
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
        visible={modalVisible}
        products={catalog}
        onSelect={handleAddProduct}
        onClose={() => setModalVisible(false)}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
    marginTop: 8,
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
