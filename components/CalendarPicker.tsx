import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius } from '../lib/theme';

interface CalendarPickerProps {
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarPicker({ selectedDate, onDateSelect }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatDate = (day: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const handleDatePress = (day: number) => {
    const dateStr = formatDate(day);
    if (selectedDate === dateStr) {
      onDateSelect(null);
    } else {
      onDateSelect(dateStr);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Text style={styles.navText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}년 {month + 1}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Text style={styles.navText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((day, cellIndex) => {
            if (day === null) {
              return <View key={`empty-${cellIndex}`} style={styles.cell} />;
            }
            const dateStr = formatDate(day);
            const isSelected = selectedDate === dateStr;
            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === day;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.cell,
                  isSelected && styles.selectedCell,
                  isToday && !isSelected && styles.todayCell,
                ]}
                onPress={() => handleDatePress(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDayText,
                    isToday && !isSelected && styles.todayDayText,
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
          {row.length < 7 &&
            Array.from({ length: 7 - row.length }).map((_, i) => (
              <View key={`pad-${i}`} style={styles.cell} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  navText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: radius.sm,
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  todayCell: {
    backgroundColor: colors.primaryLight,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedDayText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
