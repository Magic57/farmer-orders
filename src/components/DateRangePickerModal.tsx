import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../constants/theme';

interface Props {
  visible: boolean;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  onApplyRange: (start: string, end: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const DateRangePickerModal: React.FC<Props> = ({
  visible,
  startDate,
  endDate,
  onApplyRange,
  onClear,
  onClose,
}) => {
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

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

  const firstDayIndex = new Date(year, month, 1).getDay();
  const shift = (firstDayIndex + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < shift; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  const formatDay = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handleSelectDay = (dayStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dayStr);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (dayStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dayStr);
      } else {
        setTempEnd(dayStr);
      }
    }
  };

  const isInRange = (dayStr: string) => {
    if (tempStart && tempEnd) {
      return dayStr > tempStart && dayStr < tempEnd;
    }
    return false;
  };

  const isEdge = (dayStr: string) => {
    return dayStr === tempStart || dayStr === tempEnd;
  };

  const handleApply = () => {
    if (tempStart && !tempEnd) {
      onApplyRange(tempStart, tempStart);
    } else {
      onApplyRange(tempStart, tempEnd);
    }
    onClose();
  };

  const handleReset = () => {
    setTempStart('');
    setTempEnd('');
    onClear();
    onClose();
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

          <View style={styles.selectedRangeDisplay}>
            <Text style={styles.rangeDisplayText}>
              {tempStart ? tempStart.split('-').reverse().join('.') : 'Начало'}
              {'  —  '}
              {tempEnd ? tempEnd.split('-').reverse().join('.') : (tempStart ? 'выберите конец' : 'Конец')}
            </Text>
          </View>

          <View style={styles.weekRow}>
            {daysOfWeek.map((d, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }
              const dayStr = formatDay(day);
              const edge = isEdge(dayStr);
              const inRange = isInRange(dayStr);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    inRange && styles.inRangeCell,
                    edge && styles.edgeCell,
                  ]}
                  onPress={() => handleSelectDay(dayStr)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      inRange && styles.inRangeText,
                      edge && styles.edgeText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetText}>Сбросить</Text>
            </TouchableOpacity>

            <View style={styles.rightActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, !tempStart && styles.applyBtnDisabled]}
                onPress={handleApply}
                disabled={!tempStart}
              >
                <Text style={styles.applyText}>Применить</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 8,
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
  selectedRangeDisplay: {
    backgroundColor: '#FAF8F5',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginBottom: 10,
  },
  rangeDisplayText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
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
  inRangeCell: {
    backgroundColor: '#E2EBDC',
    borderRadius: 0,
  },
  edgeCell: {
    backgroundColor: theme.colors.primary,
    borderRadius: 19,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.textMain,
  },
  inRangeText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  edgeText: {
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
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  resetText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.sm,
  },
  applyBtnDisabled: {
    backgroundColor: '#A8BBA4',
  },
  applyText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
