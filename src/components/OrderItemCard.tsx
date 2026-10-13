import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { OrderItem } from '../types';
import { theme } from '../constants/theme';

interface Props {
  item: OrderItem;
  onUpdateQuantity: (val: number) => void;
  onRemove: () => void;
}

export const OrderItemCard: React.FC<Props> = ({ item, onUpdateQuantity, onRemove }) => {
  const isKg = item.unit === 'kg';
  const unitLabel = isKg ? 'кг' : 'шт';

  const handleTextChange = (text: string) => {
    const cleanText = text.replace(',', '.');
    const parsed = parseFloat(cleanText);
    onUpdateQuantity(isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.productName}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rate}>
        Цена: {item.pricePerUnit} ₽ за {unitLabel}
      </Text>

      <View style={styles.controlsRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{isKg ? 'Вес (кг):' : 'Кол-во (шт):'}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={item.quantity === 0 ? '' : item.quantity.toString()}
            onChangeText={handleTextChange}
            placeholder="0"
          />
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Итого:</Text>
          <Text style={styles.totalValue}>{item.totalPrice.toFixed(2)} ₽</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    flex: 1,
  },
  removeText: {
    fontSize: 18,
    color: theme.colors.danger,
    fontWeight: 'bold',
    paddingLeft: 8,
  },
  rate: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textMain,
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 75,
    textAlign: 'center',
    fontSize: 15,
    backgroundColor: '#FAF8F5',
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
