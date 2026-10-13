import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { Customer } from '../types';
import { theme } from '../constants/theme';

interface Props {
  visible: boolean;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export const SelectCustomerModal: React.FC<Props> = ({
  visible,
  customers,
  onSelect,
  onClose,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const handleStartEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      Alert.alert('Ошибка', 'Имя заказчика не может быть пустым');
      return;
    }

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      };
      onSaveCustomer(updated);
      setEditingCustomer(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Постоянные заказчики</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Закрыть</Text>
          </TouchableOpacity>
        </View>

        {/* Форма редактирования заказчика */}
        {editingCustomer && (
          <View style={styles.editSection}>
            <Text style={styles.editTitle}>✏️ Редактирование заказчика</Text>
            <TextInput
              style={styles.input}
              placeholder="Имя заказчика *"
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              style={styles.input}
              placeholder="Номер телефона"
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={setEditPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Адрес доставки"
              value={editAddress}
              onChangeText={setEditAddress}
            />
            <View style={styles.editButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => setEditingCustomer(null)}
              >
                <Text style={styles.cancelBtnText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.saveBtn]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveBtnText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {customers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Список заказчиков пуст</Text>
            <Text style={styles.emptySubText}>
              При сохранении заказов постоянные клиенты автоматически сохраняются в этот список.
            </Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.info}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.name}>{item.name}</Text>
                  {item.phone ? <Text style={styles.phone}>📞 {item.phone}</Text> : null}
                  {item.address ? <Text style={styles.address}>📍 {item.address}</Text> : null}
                  <Text style={styles.selectHint}>Нажмите, чтобы вставить в заказ</Text>
                </TouchableOpacity>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleStartEdit(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onDeleteCustomer(item.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    color: theme.colors.primary,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  editSection: {
    backgroundColor: theme.colors.cardBg,
    margin: theme.spacing.md,
    marginBottom: 0,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  editTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 8,
    fontSize: 14,
    marginBottom: 6,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: '#ECE7DE',
  },
  cancelBtnText: {
    color: theme.colors.textMain,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  list: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textMain,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  selectHint: {
    fontSize: 11,
    color: theme.colors.primary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 6,
  },
  editIcon: {
    fontSize: 16,
  },
  deleteText: {
    fontSize: 18,
    color: theme.colors.danger,
    fontWeight: 'bold',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textMain,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
