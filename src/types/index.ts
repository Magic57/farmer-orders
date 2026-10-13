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
  unit: UnitType; // исходная единица товара в каталоге
  pricePerUnit: number;
  piecesCount?: number; // количество штук (например: 2 кролика / 3 курицы)
  actualWeight?: number; // фактический вес в кг при взвешивании (например: 4.155 кг)
  quantity: number; // итоговое число для расчета цены (штуки или фактический вес)
  totalPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDate?: string; // Дата доставки (формат YYYY-MM-DD или DD.MM.YYYY)
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
