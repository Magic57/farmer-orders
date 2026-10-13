export type UnitType = 'piece' | 'kg';

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
  OrderHistory: undefined;
};
