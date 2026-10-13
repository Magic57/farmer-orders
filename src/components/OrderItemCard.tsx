import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { OrderItem } from '../types';
import { theme } from '../constants/theme';

interface Props {
  item: OrderItem;
  onUpdateItem: (updated: { piecesCount?: number; actualWeight?: number; quantity: number; totalPrice: number }) => void;
  onRemove: () => void;
  showWeightInput?: boolean; // Показывать ли поле фактического взвешивания (для работы/доставки)
}

export const OrderItemCard: React.FC<Props> = ({
  item,
  onUpdateItem,
  onRemove,
  showWeightInput = true,
}) => {
  const isKgProduct = item.unit === 'kg';

  // Поле штук
  const [piecesText, setPiecesText] = useState<string>(
    item.piecesCount !== undefined ? item.piecesCount.toString() : (isKgProduct ? '1' : item.quantity.toString())
  );

  // Поле фактического веса
  const [weightText, setWeightText] = useState<string>(
    item.actualWeight !== undefined && item.actualWeight > 0 ? item.actualWeight.toString() : ''
  );

  useEffect(() => {
    if (item.piecesCount !== undefined) {
      setPiecesText(item.piecesCount.toString());
    }
    if (item.actualWeight !== undefined) {
      setWeightText(item.actualWeight > 0 ? item.actualWeight.toString() : '');
    }
  }, [item.piecesCount, item.actualWeight]);

  const handlePiecesChange = (text: string) => {
    // Только целые числа для штук
    const clean = text.replace(/[^0-9]/g, '');
    setPiecesText(clean);

    const pieces = parseInt(clean, 10) || 0;
    const currentWeight = parseFloat(weightText.replace(',', '.')) || 0;

    let qty = 0;
    let total = 0;

    if (isKgProduct) {
      // Если весовой товар: если фактический вес уже взвешен, считаем по нему, иначе 0 ₽ до взвешивания
      qty = currentWeight > 0 ? currentWeight : 0;
      total = parseFloat((qty * item.pricePerUnit).toFixed(2));
    } else {
      // Если штучный товар: считаем по штукам
      qty = pieces;
      total = parseFloat((pieces * item.pricePerUnit).toFixed(2));
    }

    onUpdateItem({
      piecesCount: pieces,
      actualWeight: currentWeight,
      quantity: qty,
      totalPrice: total,
    });
  };

  const handleWeightChange = (text: string) => {
    const normalized = text.replace(',', '.');
    // До 3 знаков после запятой
    if (normalized !== '' && !/^\d+(\.\d{0,3})?$/.test(normalized)) {
      return;
    }
    setWeightText(text);

    const pieces = parseInt(piecesText, 10) || 0;
    const weight = parseFloat(normalized) || 0;

    const total = parseFloat((weight * item.pricePerUnit).toFixed(2));

    onUpdateItem({
      piecesCount: pieces,
      actualWeight: weight,
      quantity: weight,
      totalPrice: total,
    });
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
        Цена: {item.pricePerUnit} ₽ за {item.unit === 'kg' ? 'кг' : 'шт'}
      </Text>

      <View style={styles.controlsRow}>
        {/* Поле количества штук (доступно всегда: и для штучных, и для весовых тушек) */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            {isKgProduct ? 'Кол-во (шт):' : 'Кол-во:'}
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={piecesText}
            onChangeText={handlePiecesChange}
            placeholder="0"
          />
        </View>

        {/* Для весовых товаров: ввод фактического веса */}
        {isKgProduct && showWeightInput && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Вес (кг):</Text>
            <TextInput
              style={[styles.input, styles.inputKg]}
              keyboardType="decimal-pad"
              value={weightText}
              onChangeText={handleWeightChange}
              placeholder="0.000"
            />
          </View>
        )}

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Итого:</Text>
          <Text style={styles.totalValue}>
            {isKgProduct && (!item.actualWeight || item.actualWeight === 0)
              ? 'до взвеш.'
              : `${item.totalPrice.toFixed(2)} ₽`}
          </Text>
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
    flexWrap: 'wrap',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginVertical: 4,
  },
  inputLabel: {
    fontSize: 13,
    color: theme.colors.textMain,
    marginRight: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: '#FAF8F5',
  },
  inputKg: {
    width: 85,
  },
  totalBlock: {
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
