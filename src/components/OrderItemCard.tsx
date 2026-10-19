import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { OrderItem } from '../types';
import { theme } from '../constants/theme';

interface Props {
  item: OrderItem;
  onUpdateItem: (updated: { piecesCount?: number; actualWeight?: number; quantity: number; totalPrice: number }) => void;
  onRemove: () => void;
  showWeightInput?: boolean;
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

  const updatePiecesValue = (newPieces: number) => {
    const validPieces = Math.max(0, newPieces);
    setPiecesText(validPieces.toString());

    const currentWeight = parseFloat(weightText.replace(',', '.')) || 0;
    let qty = 0;
    let total = 0;

    if (isKgProduct) {
      qty = currentWeight > 0 ? currentWeight : 0;
      total = parseFloat((qty * item.pricePerUnit).toFixed(2));
    } else {
      qty = validPieces;
      total = parseFloat((validPieces * item.pricePerUnit).toFixed(2));
    }

    onUpdateItem({
      piecesCount: validPieces,
      actualWeight: currentWeight,
      quantity: qty,
      totalPrice: total,
    });
  };

  const handlePiecesChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    const pieces = parseInt(clean, 10) || 0;
    updatePiecesValue(pieces);
  };

  const handleIncrement = () => {
    const current = parseInt(piecesText, 10) || 0;
    updatePiecesValue(current + 1);
  };

  const handleDecrement = () => {
    const current = parseInt(piecesText, 10) || 0;
    if (current > 1) {
      updatePiecesValue(current - 1);
    }
  };

  const handleWeightChange = (text: string) => {
    const normalized = text.replace(',', '.');
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
        {/* Блок со счетчиком количества штук и кнопками [-] и [+] */}
        <View style={styles.counterBlock}>
          <Text style={styles.inputLabel}>
            {isKgProduct ? 'Кол-во штук:' : 'Количество:'}
          </Text>

          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={handleDecrement}
              activeOpacity={0.6}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.stepInput}
              keyboardType="number-pad"
              value={piecesText}
              onChangeText={handlePiecesChange}
              placeholder="0"
            />

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={handleIncrement}
              activeOpacity={0.6}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Сумма:</Text>
          <Text style={styles.totalValue}>
            {isKgProduct && (!item.actualWeight || item.actualWeight === 0)
              ? 'до взвеш.'
              : `${item.totalPrice.toFixed(2)} ₽`}
          </Text>
        </View>
      </View>

      {/* Для весовых товаров: крупный, яркий блок ввода фактического веса товара */}
      {isKgProduct && showWeightInput && (
        <View
          style={[
            styles.weightSection,
            (!item.actualWeight || item.actualWeight === 0)
              ? styles.weightSectionPending
              : styles.weightSectionDone,
          ]}
        >
          <View style={styles.weightHeaderRow}>
            <Text style={styles.weightSectionTitle}>⚖️ ВВЕДИТЕ ВЕС ТОВАРА:</Text>
            {item.actualWeight && item.actualWeight > 0 ? (
              <View style={styles.weightBadgeDone}>
                <Text style={styles.weightBadgeDoneText}>✓ Взвешено</Text>
              </View>
            ) : (
              <View style={styles.weightBadgePending}>
                <Text style={styles.weightBadgePendingText}>Ждет взвешивания</Text>
              </View>
            )}
          </View>

          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInputBig}
              keyboardType="decimal-pad"
              value={weightText}
              onChangeText={handleWeightChange}
              placeholder="0.000"
              placeholderTextColor="#888888"
              selectTextOnFocus
            />
            <Text style={styles.weightUnitBig}>кг</Text>
          </View>

          <Text style={styles.weightHintText}>
            {item.actualWeight && item.actualWeight > 0
              ? `Рассчитано: ${item.actualWeight} кг × ${item.pricePerUnit} ₽ = ${item.totalPrice.toFixed(2)} ₽`
              : 'Введите точный вес с весов в килограммах (например: 1.45)'}
          </Text>
        </View>
      )}
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
  counterBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginVertical: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.textMain,
    marginRight: 8,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#ECE7DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  stepInput: {
    width: 48,
    height: 38,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    paddingVertical: 0,
  },
  totalBlock: {
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  // Крупный блок ввода веса товара
  weightSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 2,
  },
  weightSectionPending: {
    backgroundColor: '#FFFDE7', // Теплый мягкий желтый цвет для привлечения внимания
    borderColor: '#FBC02D',
  },
  weightSectionDone: {
    backgroundColor: '#F1F8E9', // Мягкий зеленый при заполненном весе
    borderColor: '#4CAF50',
  },
  weightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333333',
    letterSpacing: 0.5,
  },
  weightBadgePending: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weightBadgePendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F4F00',
  },
  weightBadgeDone: {
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  weightBadgeDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingHorizontal: 16,
    height: 56,
  },
  weightInputBig: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textMain,
    textAlign: 'center',
    height: 54,
  },
  weightUnitBig: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    marginLeft: 8,
  },
  weightHintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
});
