import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { Product, Order, Customer } from '../types';

const PRODUCTS_KEY = '@farmer_products';
const ORDERS_KEY = '@farmer_orders';
const CUSTOMERS_KEY = '@farmer_customers';

export const StorageService = {
  // === REALTIME СИНХРОНИЗАЦИЯ ЧЕРЕЗ FIRESTORE ===

  // Подписка на обновление товаров в реальном времени
  subscribeProducts(farmId: string, callback: (products: Product[]) => void) {
    // Сначала сразу отдаем локальный кеш
    this.getProducts().then(callback);

    if (!farmId) {
      return () => {};
    }

    const q = query(collection(db, 'products'), where('farmId', '==', farmId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Product[] = [];
        snap.forEach((d) => list.push(d.data() as Product));
        list.sort((a, b) => b.createdAt - a.createdAt);
        // Кешируем локально
        AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
        callback(list);
      },
      (err) => {
        console.warn('Оффлайн-режим подписки на товары:', err);
        this.getProducts().then(callback);
      }
    );
  },

  // Подписка на обновление заказов в реальном времени
  subscribeOrders(farmId: string, callback: (orders: Order[]) => void) {
    // Сначала сразу отдаем локальный кеш
    this.getOrders().then(callback);

    if (!farmId) {
      return () => {};
    }

    const q = query(collection(db, 'orders'), where('farmId', '==', farmId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Order[] = [];
        snap.forEach((d) => list.push(d.data() as Order));
        list.sort((a, b) => b.createdAt - a.createdAt);
        // Кешируем локально
        AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(list));
        callback(list);
      },
      (err) => {
        console.warn('Оффлайн-режим подписки на заказы:', err);
        this.getOrders().then(callback);
      }
    );
  },

  // Подписка на клиентов в реальном времени
  subscribeCustomers(farmId: string, callback: (customers: Customer[]) => void) {
    // Сначала сразу отдаем локальный кеш
    this.getCustomers().then(callback);

    if (!farmId) {
      return () => {};
    }

    const q = query(collection(db, 'customers'), where('farmId', '==', farmId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Customer[] = [];
        snap.forEach((d) => {
          const data: any = d.data();
          list.push({
            id: data.id || d.id,
            name: data.name || '',
            phone: data.phone || '',
            address: data.address || data.defaultAddress || '',
            createdAt: data.createdAt || 0,
            farmId: data.farmId || '',
          });
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
        callback(list);
      },
      (err) => {
        console.warn('Оффлайн-режим подписки на клиентов:', err);
        this.getCustomers().then(callback);
      }
    );
  },

  // Подписка на всех участников данного хозяйства (для роли диспетчер)
  subscribeFarmUsers(farmId: string, callback: (users: any[]) => void) {
    if (!farmId) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, 'users'), where('farmId', '==', farmId));
    return onSnapshot(
      q,
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push(d.data()));
        callback(list);
      },
      (err) => {
        console.error('Ошибка подписки на пользователей хозяйства:', err);
      }
    );
  },

  // Удалить пользователя из хозяйства (документ из Firestore)
  async deleteUserAccount(uid: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid));
  },

  // === ОПЕРАЦИИ С ТОВАРАМИ ===
  async getProducts(): Promise<Product[]> {
    try {
      const data = await AsyncStorage.getItem(PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async saveProduct(product: Product, farmId?: string): Promise<void> {
    try {
      const targetFarmId = farmId || product.farmId || '';
      const prodToSave: Product = {
        id: product.id,
        name: product.name,
        unit: product.unit,
        pricePerUnit: product.pricePerUnit,
        farmId: targetFarmId,
        createdAt: product.createdAt || Date.now(),
        ...(product.imageUri ? { imageUri: product.imageUri } : {}),
      };

      // Локальный кеш сохраняем обязательно
      const products = await this.getProducts();
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        products[index] = prodToSave;
      } else {
        products.unshift(prodToSave);
      }
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

      // Синхронизация с Firestore (если есть связь)
      if (targetFarmId) {
        await setDoc(doc(db, 'products', product.id), prodToSave).catch((err) => {
          console.warn('Товар сохранен локально, синхронизация с облаком отложена (оффлайн):', err);
        });
      }
    } catch (e) {
      console.error('Ошибка сохранения товара:', e);
      throw e;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      const products = await this.getProducts();
      const filtered = products.filter((p) => p.id !== id);
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));

      await deleteDoc(doc(db, 'products', id)).catch((err) => {
        console.warn('Удаление товара выполнено локально (оффлайн):', err);
      });
    } catch (e) {
      console.error('Ошибка удаления товара:', e);
      throw e;
    }
  },

  // === ОПЕРАЦИИ С ЗАКАЗАМИ ===
  async getOrders(): Promise<Order[]> {
    try {
      const data = await AsyncStorage.getItem(ORDERS_KEY);
      if (!data) return [];
      const list: Order[] = JSON.parse(data);
      return list.map((order) => ({
        ...order,
        status: order.status || 'formed',
      }));
    } catch (e) {
      return [];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === id) || null;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    try {
      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === id);
      if (index >= 0) {
        orders[index].status = status;
        if (status === 'completed') {
          orders[index].completedAt = Date.now();
        }
        await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      }

      const updates: any = { status };
      if (status === 'completed') {
        updates.completedAt = Date.now();
      }
      await updateDoc(doc(db, 'orders', id), updates).catch((err) => {
        console.warn('Статус заказа обновлен локально (оффлайн):', err);
      });
    } catch (e) {
      console.error(e);
    }
  },

  async saveOrder(order: Order, farmId?: string): Promise<void> {
    try {
      const targetFarmId = farmId || order.farmId || '';
      // Firestore не принимает undefined поля — очищаем объект
      const orderToSave: any = {
        id: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        items: order.items.map((i: any) => {
          const itemAmount = i.totalPrice !== undefined ? i.totalPrice : (i.amount !== undefined ? i.amount : 0);
          const itemClean: any = {
            id: i.id || Date.now().toString(),
            productId: i.productId || '',
            productName: i.productName || '',
            unit: i.unit || 'piece',
            pricePerUnit: i.pricePerUnit || 0,
            quantity: i.quantity !== undefined ? i.quantity : 0,
            totalPrice: itemAmount,
          };
          if (i.piecesCount !== undefined && i.piecesCount !== null) itemClean.piecesCount = i.piecesCount;
          if (i.actualWeight !== undefined && i.actualWeight !== null) itemClean.actualWeight = i.actualWeight;
          return itemClean;
        }),
        totalAmount: order.totalAmount || 0,
        status: order.status || 'formed',
        farmId: targetFarmId,
        createdAt: order.createdAt || Date.now(),
      };
      if (order.deliveryAddress) orderToSave.deliveryAddress = order.deliveryAddress;
      if (order.deliveryDate) orderToSave.deliveryDate = order.deliveryDate;
      if (order.comment) orderToSave.comment = order.comment;
      if (order.completedAt) orderToSave.completedAt = order.completedAt;

      // Локальный кеш сохраняем сразу
      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === order.id);
      if (index >= 0) {
        orders[index] = orderToSave;
      } else {
        orders.unshift(orderToSave);
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

      // Синхронизация с Firestore
      if (targetFarmId) {
        await setDoc(doc(db, 'orders', order.id), orderToSave).catch((err) => {
          console.warn('Заказ сохранен локально, синхронизация с облаком отложена (оффлайн):', err);
        });
      }
    } catch (e) {
      console.error('Ошибка сохранения заказа:', e);
      throw e;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      const orders = await this.getOrders();
      const filtered = orders.filter((o) => o.id !== id);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));

      await deleteDoc(doc(db, 'orders', id)).catch((err) => {
        console.warn('Удаление заказа выполнено локально (оффлайн):', err);
      });
    } catch (e) {
      console.error('Ошибка удаления заказа:', e);
      throw e;
    }
  },

  async deleteOrdersBatch(ids: string[]): Promise<void> {
    try {
      if (!ids || ids.length === 0) return;
      const idsSet = new Set(ids);
      // Удаляем из Firestore параллельно
      await Promise.allSettled(ids.map((id) => deleteDoc(doc(db, 'orders', id))));

      // Удаляем из локального AsyncStorage
      const orders = await this.getOrders();
      const filtered = orders.filter((o) => !idsSet.has(o.id));
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Ошибка массового удаления заказов:', e);
      throw e;
    }
  },

  // === КЛИЕНТЫ ===
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      if (!data) return [];
      const list: any[] = JSON.parse(data);
      return list.map((c) => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        address: c.address || c.defaultAddress || '',
        createdAt: c.createdAt || 0,
        farmId: c.farmId || '',
      }));
    } catch (e) {
      return [];
    }
  },

  async saveCustomer(customer: Customer, farmId?: string): Promise<void> {
    try {
      const targetFarmId = farmId || customer.farmId || '';
      const normName = customer.name.trim().toLowerCase();
      const normPhone = (customer.phone || '').trim();

      // Ищем существующего постоянного клиента по id или по имени/телефону
      const existingCustomers = await this.getCustomers();
      const found = existingCustomers.find(
        (c) =>
          c.id === customer.id ||
          (normName && c.name.trim().toLowerCase() === normName) ||
          (normPhone && c.phone && c.phone.trim() === normPhone)
      );

      const targetId = found ? found.id : customer.id;
      // Если передан новый адрес — берем его, иначе если был старый — сохраняем старый
      const addressToSave = (customer.address || (customer as any).defaultAddress || found?.address || '').trim();

      const custToSave: Customer = {
        id: targetId,
        name: customer.name.trim(),
        phone: (customer.phone || found?.phone || '').trim(),
        address: addressToSave,
        farmId: targetFarmId,
        createdAt: found?.createdAt || customer.createdAt || Date.now(),
      };

      const index = existingCustomers.findIndex((c) => c.id === targetId);
      if (index >= 0) {
        existingCustomers[index] = custToSave;
      } else {
        existingCustomers.unshift(custToSave);
      }
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(existingCustomers));

      if (targetFarmId) {
        await setDoc(doc(db, 'customers', targetId), custToSave).catch((err) => {
          console.warn('Клиент сохранен локально, синхронизация с облаком отложена (оффлайн):', err);
        });
      }
    } catch (e) {
      console.error('Ошибка сохранения заказчика:', e);
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const filtered = customers.filter((c) => c.id !== id);
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));

      await deleteDoc(doc(db, 'customers', id)).catch((err) => {
        console.warn('Клиент удален локально (оффлайн):', err);
      });
    } catch (e) {
      console.error('Ошибка удаления заказчика:', e);
    }
  },
};
