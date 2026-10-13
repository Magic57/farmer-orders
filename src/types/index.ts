export type UnitType = 'piece' | 'kg';

export type OrderStatus = 'formed' | 'in_progress' | 'completed';

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  pricePerUnit: number;
  imageUri?: string;
  createdAt: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: UnitType;
  pricePerUnit: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: number;
  completedAt?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: number;
}

export type RootStackParamList = {
  MainTabs: undefined;
  EditProduct: { product?: Product };
  EditOrder: { orderId: string };
};

export type MainTabParamList = {
  Products: undefined;
  NewOrder: undefined;
  DeliveryToday: undefined;
  OrderHistory: undefined;
};
