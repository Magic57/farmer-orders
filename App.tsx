import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';

import { RootStackParamList, MainTabParamList } from './src/types';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { EditProductScreen } from './src/screens/EditProductScreen';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { DeliveryTodayScreen } from './src/screens/DeliveryTodayScreen';
import { EditOrderScreen } from './src/screens/EditOrderScreen';
import { OrderHistoryScreen } from './src/screens/OrderHistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { theme } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { user, isDriverMode } = useAuth();
  const isPicker = user?.role === 'picker';
  const isCourier = user?.role === 'courier';
  const showManagerTabs = !isPicker && (!isCourier || !isDriverMode);

  return (
    <Tab.Navigator
      initialRouteName={isCourier || isPicker ? 'DeliveryToday' : 'Products'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.cardBg,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      {/* Диспетчер, а также Развозчик при переключении в режим Диспетчера видят каталог и новый заказ */}
      {showManagerTabs && (
        <Tab.Screen
          name="Products"
          component={ProductsScreen}
          options={{
            tabBarLabel: 'Каталог',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>🥬</Text>,
          }}
        />
      )}

      {showManagerTabs && (
        <Tab.Screen
          name="NewOrder"
          component={NewOrderScreen}
          options={{
            tabBarLabel: 'Новый заказ',
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>🛒</Text>,
          }}
        />
      )}

      {/* Вкладка Развозка/Сборка видна всем ролям */}
      <Tab.Screen
        name="DeliveryToday"
        component={DeliveryTodayScreen}
        options={{
          tabBarLabel: isPicker ? 'Сборка' : 'Развозка',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{isPicker ? '📦' : '🚚'}</Text>,
        }}
      />

      <Tab.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'История',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📋</Text>,
        }}
      />

      {/* Профиль и код хозяйства */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Ферма',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏡</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.primary, fontWeight: '600' }}>
          Загрузка фермерской сети...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.white,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProduct"
              component={EditProductScreen}
              options={({ route }) => ({
                title: route.params?.product ? 'Редактировать товар' : 'Новый товар',
              })}
            />
            <Stack.Screen
              name="EditOrder"
              component={EditOrderScreen}
              options={{ title: 'Детали заказа' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationRoot />
    </AuthProvider>
  );
}
