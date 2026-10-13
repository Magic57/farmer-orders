import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product, RootStackParamList } from '../types';
import { StorageService } from '../services/storage';
import { ProductCard } from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { theme } from '../constants/theme';

export const ProductsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = StorageService.subscribeProducts(user?.farmId || '', (list) => {
      setProducts(list);
    });
    return unsubscribe;
  }, [user?.farmId]);

  useFocusEffect(
    useCallback(() => {
      StorageService.getProducts().then((list) => {
        if (list.length > 0) {
          if (user?.farmId) {
            setProducts(list.filter((p) => p.farmId === user.farmId));
          } else {
            setProducts(list);
          }
        }
      });
    }, [user?.farmId])
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Text style={styles.title}>Каталог товаров</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('EditProduct', {})}
        >
          <Text style={styles.addBtnText}>+ Добавить</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🧺</Text>
          <Text style={styles.emptyTitle}>Нет добавленных товаров</Text>
          <Text style={styles.emptySubtitle}>
            Нажмите «+ Добавить», чтобы создать первый товар (овощи, фрукты, мясо, сыр и т.д.)
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('EditProduct', { product: item })}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.cardBg,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
  },
  addBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  list: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
