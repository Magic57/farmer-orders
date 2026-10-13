import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { RootStackParamList, MainTabParamList } from './src/types';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { EditProductScreen } from './src/screens/EditProductScreen';
import { NewOrderScreen } from './src/screens/NewOrderScreen';
import { DeliveryTodayScreen } from './src/screens/DeliveryTodayScreen';
import { EditOrderScreen } from './src/screens/EditOrderScreen';
import { OrderHistoryScreen } from './src/screens/OrderHistoryScreen';
import { theme } from './src/constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'Каталог',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🥬</Text>,
        }}
      />
      <Tab.Screen
        name="NewOrder"
        component={NewOrderScreen}
        options={{
          tabBarLabel: 'Новый заказ',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="DeliveryToday"
        component={DeliveryTodayScreen}
        options={{
          tabBarLabel: 'Развозка',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚚</Text>,
        }}
      />
      <Tab.Screen
        name="OrderHistory"
        component={OrderHistoryScreen}
        options={{
          tabBarLabel: 'История',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📦</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
