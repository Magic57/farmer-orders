import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Настройка отображения уведомлений когда приложение на переднем плане
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PUSH_TOKEN_CACHE_KEY = '@farmer_push_token';

export const NotificationService = {
  // Регистрация пуш-уведомлений и получение токена
  async registerForPushNotificationsAsync(uid?: string): Promise<string | null> {
    let token: string | null = null;

    try {
      if (Platform.OS === 'android') {
        // Создаем канал уведомлений с максимальным приоритетом и звуком
        await Notifications.setNotificationChannelAsync('orders_channel', {
          name: 'Уведомления о заказах',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D5A27',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      if (!Device.isDevice) {
        console.log('Эмулятор: Push-токен устройства недоступен');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Пользователь отклонил разрешение на Push-уведомления');
        return null;
      }

      // Получаем Expo Push Token
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        token = tokenData.data;
      } catch (expoErr) {
        // Если проект без EAS projectId, берем Device Push Token
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          token = deviceToken.data;
        } catch (deviceErr) {
          console.warn('Не удалось получить токен пуш-уведомлений:', expoErr);
        }
      }

      if (token) {
        await AsyncStorage.setItem(PUSH_TOKEN_CACHE_KEY, token);

        // Сохраняем токен в профиле пользователя в Firestore
        if (uid) {
          await updateDoc(doc(db, 'users', uid), {
            pushToken: token,
            lastTokenUpdate: Date.now(),
          }).catch((err) => {
            console.warn('Не удалось сохранить pushToken в Firestore:', err);
          });
        }
      }
    } catch (e) {
      console.warn('Ошибка при регистрации Push-уведомлений:', e);
    }

    return token;
  },

  // Отправка Push-уведомлений на список токенов через Expo Push API
  async sendPushNotification(tokens: string[], title: string, body: string, data?: any): Promise<void> {
    const validTokens = tokens.filter((t) => !!t && typeof t === 'string' && t.trim().length > 0);
    if (validTokens.length === 0) return;

    // Формируем сообщения
    const messages = validTokens.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'orders_channel',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const resData = await response.json();
      console.log('Результат отправки Push-уведомлений:', resData);
    } catch (error) {
      console.error('Ошибка отправки Push-уведомлений через Expo API:', error);
    }
  },

  // Локальное уведомление на текущем устройстве (со звуком и вибрацией)
  async showLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          color: '#2D5A27',
        },
        trigger: null, // немедленно
      });
    } catch (e) {
      console.warn('Ошибка показа локального уведомления:', e);
    }
  },

  // Уведомить сборщиков хозяйства о новом заказе, отправленном в сборку
  async notifyPickersOnAssembly(
    farmId: string,
    orderNumber: number | string,
    customerName: string,
    itemsCount: number
  ): Promise<void> {
    if (!farmId) return;

    try {
      // Ищем всех пользователей хозяйства с ролью 'picker'
      const q = query(
        collection(db, 'users'),
        where('farmId', '==', farmId),
        where('role', '==', 'picker')
      );
      const snap = await getDocs(q);
      const tokens: string[] = [];

      snap.forEach((d) => {
        const u = d.data();
        if (u.pushToken) {
          tokens.push(u.pushToken);
        }
      });

      const title = '📦 Новый заказ на сборку!';
      const orderNumStr = orderNumber ? `#${orderNumber}` : '';
      const body = `Заказ ${orderNumStr} (${customerName}) передан в сборку. Позиций: ${itemsCount}`;

      await this.sendPushNotification(tokens, title, body, { type: 'order_assembly', orderNumber });
    } catch (e) {
      console.error('Ошибка отправки уведомления сборщикам:', e);
    }
  },

  // Уведомить диспетчеров и развозчиков о завершении сборки заказа
  async notifyDispatchersAndCouriersOnAssembled(
    farmId: string,
    orderNumber: number | string,
    customerName: string
  ): Promise<void> {
    if (!farmId) return;

    try {
      // Ищем всех пользователей хозяйства с ролями 'manager' и 'courier'
      const q = query(
        collection(db, 'users'),
        where('farmId', '==', farmId),
        where('role', 'in', ['manager', 'courier'])
      );
      const snap = await getDocs(q);
      const tokens: string[] = [];

      snap.forEach((d) => {
        const u = d.data();
        if (u.pushToken) {
          tokens.push(u.pushToken);
        }
      });

      const title = '✅ Заказ собран!';
      const orderNumStr = orderNumber ? `#${orderNumber}` : '';
      const body = `Заказ ${orderNumStr} (${customerName}) собран и готов к доставке`;

      await this.sendPushNotification(tokens, title, body, { type: 'order_assembled', orderNumber });
    } catch (e) {
      console.error('Ошибка отправки уведомления диспетчерам и развозчикам:', e);
    }
  },
};
