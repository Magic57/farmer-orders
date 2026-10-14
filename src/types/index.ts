export type UnitType = 'piece' | 'kg';

export type OrderStatus = 'formed' | 'assembling' | 'assembled' | 'in_progress' | 'completed';

export type UserRole = 'manager' | 'picker' | 'courier'; // Диспетчер / Сборщик / Развозчик

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  farmId: string; // ID хозяйства
  farmName: string;
  inviteCode: string; // Код приглашения в хозяйство
}

export interface Farm {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: number;
  ownerUid: string;
}

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  pricePerUnit: number;
  imageUri?: string;
  createdAt: number;
  farmId?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: UnitType;
  pricePerUnit: number;
  piecesCount?: number;
  actualWeight?: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDate?: string;
  comment?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: number;
  completedAt?: number;
  farmId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: number;
  farmId?: string;
}

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  EditProduct: { product?: Product };
  EditOrder: { orderId: string };
};

export type MainTabParamList = {
  Products: undefined;
  NewOrder: undefined;
  DeliveryToday: undefined;
  OrderHistory: undefined;
  Profile: undefined;
};
