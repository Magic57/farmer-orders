import React, { useState, useEffect } from 'react';
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

  // Локальный стейт строки, чтобы пользователь мог комфортно вводить запятую/точку и до 3 знаков
  const [textValue, setTextValue] = useState<string>(
    item.quantity === 0 ? '' : item.quantity.toString()
  );

  useEffect(() => {
    // Синхронизируем, если значение изменилось извне
    const currentParsed = parseFloat(textValue.replace(',', '.'));
    if (isNaN(currentParsed) && item.quantity === 0) return;
    if (currentParsed !== item.quantity) {
      setTextValue(item.quantity === 0 ? '' : item.quantity.toString());
    }
  }, [item.quantity]);

  const handleTextChange = (text: string) => {
    // Разрешаем только цифры, одну точку или запятую
    const normalized = text.replace(',', '.');
    
    // Проверка формата: до 3 знаков после запятой для кг, только целые для шт
    if (isKg) {
      // Регулярка: цифры с опциональной точкой и до 3 знаков после неё
      if (normalized !== '' && !/^\d+(\.\d{0,3})?$/.test(normalized)) {
        return;
      }
    } else {
      // Для штук только целые положительные числа
      if (normalized !== '' && !/^\d+$/.test(normalized)) {
        return;
      }
    }

    setTextValue(text);

    if (text === '' || text === '.') {
      onUpdateQuantity(0);
      return;
    }

    const parsed = parseFloat(normalized);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateQuantity(parsed);
    }
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
            style={[styles.input, isKg && styles.inputKg]}
            keyboardType="decimal-pad"
            value={textValue}
            onChangeText={handleTextChange}
            placeholder={isKg ? '0.000' : '0'}
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 75,
    textAlign: 'center',
    fontSize: 15,
    backgroundColor: '#FAF8F5',
  },
  inputKg: {
    width: 95, // Расширенное поле для ввода трех знаков после запятой (например 4,155)
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
