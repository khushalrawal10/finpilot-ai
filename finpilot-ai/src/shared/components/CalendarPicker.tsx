import React, { useCallback, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import T from '@shared/theme';

// ============================================================
// Types
// ============================================================

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  maxDate?: Date;
}

// ============================================================
// Helpers
// ============================================================

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

// ============================================================
// CalendarPicker
// ============================================================

export default function CalendarPicker({
  visible,
  selectedDate,
  onSelect,
  onClose,
  maxDate,
}: CalendarPickerProps): React.JSX.Element | null {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Reset view when opening
  React.useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const isNextDisabled = useMemo(() => {
    if (!maxDate) return false;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return nextYear > maxDate.getFullYear() ||
      (nextYear === maxDate.getFullYear() && nextMonth > maxDate.getMonth());
  }, [viewMonth, viewYear, maxDate]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells: Array<{ day: number; disabled: boolean } | null> = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const disabled = maxDate ? isAfter(date, maxDate) : false;
      cells.push({ day: d, disabled });
    }

    return cells;
  }, [viewYear, viewMonth, maxDate]);

  const handleDayPress = useCallback(
    (day: number) => {
      const newDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
      onSelect(newDate);
      onClose();
    },
    [viewYear, viewMonth, onSelect, onClose],
  );

  const handleSelectToday = useCallback(() => {
    const now = new Date();
    onSelect(now);
    onClose();
  }, [onSelect, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={handlePrevMonth}
              style={styles.navButton}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={20} color={T.colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.monthText}>{MONTHS[viewMonth]}</Text>
              <Text style={styles.yearText}>{viewYear}</Text>
            </View>

            <Pressable
              onPress={handleNextMonth}
              style={[styles.navButton, isNextDisabled && styles.navDisabled]}
              disabled={isNextDisabled}
              hitSlop={12}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isNextDisabled ? T.colors.border : T.colors.text}
              />
            </Pressable>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <View key={wd} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              const date = new Date(viewYear, viewMonth, cell.day);
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);

              return (
                <Pressable
                  key={cell.day}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isTodayDate && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => !cell.disabled && handleDayPress(cell.day)}
                  disabled={cell.disabled}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isTodayDate && !isSelected && styles.dayTextToday,
                      cell.disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.todayButton} onPress={handleSelectToday}>
              <Ionicons name="today-outline" size={16} color={T.colors.primary} />
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// Styles
// ============================================================

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 340,
    maxWidth: '90%',
    backgroundColor: T.colors.background,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: T.colors.text,
    letterSpacing: -0.3,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '500',
    color: T.colors.textMuted,
    marginTop: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  dayCellSelected: {
    backgroundColor: T.colors.primary,
    borderRadius: CELL_SIZE / 2,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: T.colors.primary,
    borderRadius: CELL_SIZE / 2,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: T.colors.text,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: T.colors.primary,
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: T.colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: T.colors.primaryLight,
    gap: 6,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.colors.primary,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.colors.textMuted,
  },
});
