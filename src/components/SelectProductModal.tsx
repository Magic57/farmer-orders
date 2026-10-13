import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { theme } from '../constants/theme';

interface Props {
  visible: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export const SelectProductModal: React.FC<Props> = ({
  visible,
  products,
  onSelect,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Выберите товар</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        {products.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Каталог товаров пуст.</Text>
            <Text style={styles.emptySubText}>
              Сначала добавьте товары на вкладке «Каталог».
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
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              />
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
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
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textMain,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  list: {
    padding: theme.spacing.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textMain,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
