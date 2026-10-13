import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  visible: boolean;
  selectedDate: string; // Формат "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

export const DatePickerModal: React.FC<Props> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Первый день месяца (0 - Вс, 1 - Пн ... 6 - Сб)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Приводим к европейской неделе (0 - Пн ... 6 - Вс)
  const shift = (firstDayIndex + 6) % 7;

  // Количество дней в текущем месяце
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < shift; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const formatSelected = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return formatSelected(day) === selectedDate;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Дни недели */}
          <View style={styles.weekRow}>
            {daysOfWeek.map((d, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Сетка дней */}
          <View style={styles.daysGrid}>
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    today && styles.todayCell,
                    selected && styles.selectedCell,
                  ]}
                  onPress={() => {
                    onSelectDate(formatSelected(day));
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      today && styles.todayText,
                      selected && styles.selectedText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Кнопки внизу */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayQuickBtn}
              onPress={() => {
                const now = new Date();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                onSelectDate(`${now.getFullYear()}-${mm}-${dd}`);
                onClose();
              }}
            >
              <Text style={styles.todayQuickText}>Сегодня</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navText: {
    fontSize: 26,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 6,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectedCell: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.textMain,
  },
  todayText: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  selectedText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 10,
  },
  todayQuickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  todayQuickText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: {
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});
