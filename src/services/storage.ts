import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Order, Customer } from '../types';

const PRODUCTS_KEY = '@farmer_products';
const ORDERS_KEY = '@farmer_orders';
const CUSTOMERS_KEY = '@farmer_customers';

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
      if (!data) return [];
      const list: Order[] = JSON.parse(data);
      // Гарантируем статус для старых заказов
      return list.map((order) => ({
        ...order,
        status: order.status || 'formed',
      }));
    } catch (e) {
      console.error('Ошибка загрузки заказов:', e);
      return [];
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    const orders = await this.getOrders();
    return orders.find((o) => o.id === id) || null;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<void> {
    const orders = await this.getOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index >= 0) {
      orders[index].status = status;
      if (status === 'completed') {
        orders[index].completedAt = Date.now();
      }
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
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

  // --- Постоянные заказчики ---
  async getCustomers(): Promise<Customer[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOMERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Ошибка загрузки заказчиков:', e);
      return [];
    }
  },

  async saveCustomer(customer: Customer): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const index = customers.findIndex(
        (c) => c.id === customer.id || (c.name.toLowerCase() === customer.name.toLowerCase() && c.phone === customer.phone)
      );
      if (index >= 0) {
        customers[index] = { ...customers[index], ...customer };
      } else {
        customers.unshift(customer);
      }
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error('Ошибка сохранения заказчика:', e);
      throw e;
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      const customers = await this.getCustomers();
      const filtered = customers.filter((c) => c.id !== id);
      await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Ошибка удаления заказчика:', e);
      throw e;
    }
  },
};
