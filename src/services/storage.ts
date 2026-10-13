import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Order } from '../types';

const PRODUCTS_KEY = '@farmer_products';
const ORDERS_KEY = '@farmer_orders';

export const StorageService = {
  // --- Товары ---
  async getProducts(): Promise<Product[]> {
    try {
      const data = await AsyncStorage.getItem(PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Ошибка загрузки товаров:', e);
      return [];
    }
  },

  async saveProduct(product: Product): Promise<void> {
    try {
      const products = await this.getProducts();
      const index = products.findIndex((p) => p.id === product.id);
      if (index >= 0) {
        products[index] = product;
      } else {
        products.unshift(product);
      }
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
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
    } catch (e) {
      console.error('Ошибка удаления товара:', e);
      throw e;
    }
  },

  // --- Заказы ---
  async getOrders(): Promise<Order[]> {
    try {
      const data = await AsyncStorage.getItem(ORDERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Ошибка загрузки заказов:', e);
      return [];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === id) || null;
  },

  async saveOrder(order: Order): Promise<void> {
    try {
      const orders = await this.getOrders();
      const index = orders.findIndex((o) => o.id === order.id);
      if (index >= 0) {
        orders[index] = order;
      } else {
        orders.unshift(order);
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
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
    } catch (e) {
      console.error('Ошибка удаления заказа:', e);
      throw e;
    }
  },
};
