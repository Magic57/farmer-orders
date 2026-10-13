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
    if (!farmId) {
      this.getProducts().then(callback);
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
        console.error('Ошибка подписки на товары:', err);
        this.getProducts().then(callback);
      }
    );
  },

  // Подписка на обновление заказов в реальном времени
  subscribeOrders(farmId: string, callback: (orders: Order[]) => void) {
    if (!farmId) {
      this.getOrders().then(callback);
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
        console.error('Ошибка подписки на заказы:', err);
        this.getOrders().then(callback);
      }
    );
  },

  // Подписка на клиентов в реальном времени
  subscribeCustomers(farmId: string, callback: (customers: Customer[]) => void) {
    if (!farmId) {
      this.getCustomers().then(callback);
      return () => {};
    }

    const q = query(collection(db, 'customers'), where('farmId', '==', farmId));
    return onSnapshot(
      q,
      (snap) => {
        const list: Customer[] = [];
        snap.forEach((d) => list.push(d.data() as Customer));
        list.sort((a, b) => b.createdAt - a.createdAt);
        AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
        callback(list);
      },
      (err) => {
        console.error('Ошибка подписки на клиентов:', err);
        this.getCustomers().then(callback);
      }
    );
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
      const prodToSave = { ...product, farmId: farmId || product.farmId || '' };
      if (farmId || product.farmId) {
        await setDoc(doc(db, 'products', product.id), prodToSave);
      }
      // Локальный кеш
      const products = await this.getProducts();
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        products[index] = prodToSave;
      } else {
        products.unshift(prodToSave);
      }
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Ошибка сохранения товара:', e);
      throw e;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'products', id));
      const products = await this.getProducts();
      const filtered = products.filter((p) => p.id !== id);
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(filtered));
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
      const updates: any = { status };
      if (status === 'completed') {
        updates.completedAt = Date.now();
      }
      await updateDoc(doc(db, 'orders', id), updates).catch(() => {});

      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === id);
      if (index >= 0) {
        orders[index].status = status;
        if (status === 'completed') {
          orders[index].completedAt = Date.now();
        }
        await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      }
    } catch (e) {
      console.error(e);
    }
  },

  async saveOrder(order: Order, farmId?: string): Promise<void> {
    try {
      const orderToSave = { ...order, farmId: farmId || order.farmId || '' };
      if (farmId || order.farmId) {
        await setDoc(doc(db, 'orders', order.id), orderToSave);
      }

      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === order.id);
      if (index >= 0) {
        orders[index] = orderToSave;
      } else {
        orders.unshift(orderToSave);
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Ошибка сохранения заказа:', e);
      throw e;
    }
  },

  async deleteOrder(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'orders', id)).catch(() => {});
      const orders = await this.getOrders();
      const filtered = orders.filter((o) => o.id !== id);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Ошибка удаления заказа:', e);
      throw e;
    }
  },

  // === КЛИЕНТЫ ===
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  async saveCustomer(customer: Customer, farmId?: string): Promise<void> {
    try {
      const custToSave = { ...customer, farmId: farmId || customer.farmId || '' };
      if (farmId || customer.farmId) {
        await setDoc(doc(db, 'customers', customer.id), custToSave);
      }

      const customers = await this.getCustomers();
      const index = customers.findIndex(
        (c) => c.id === customer.id || (c.name.toLowerCase() === customer.name.toLowerCase() && c.phone === customer.phone)
      );
      if (index >= 0) {
        customers[index] = { ...customers[index], ...custToSave };
      } else {
        customers.unshift(custToSave);
      }
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Ошибка сохранения заказчика:', e);
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'customers', id)).catch(() => {});
      const customers = await this.getCustomers();
      const filtered = customers.filter((c) => c.id !== id);
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Ошибка удаления заказчика:', e);
    }
  },

  async importOrders(importedList: Order[]): Promise<number> {
    try {
      const existing = await this.getOrders();
      let addedCount = 0;
      for (const item of importedList) {
        const idx = existing.findIndex((e) => e.id === item.id);
        if (idx >= 0) {
          existing[idx] = item;
        } else {
          existing.unshift(item);
          addedCount++;
        }
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(existing));
      return addedCount;
    } catch (e) {
      console.error('Ошибка импорта заказов:', e);
      throw e;
    }
  },
};
