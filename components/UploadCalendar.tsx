import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../lib/theme';
import { t, format } from '../lib/i18n';

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 40 - 6 * 4) / 7);

interface UploadCalendarProps {
  userId: string;
}

export default function UploadCalendar({ userId }: UploadCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [uploadMap, setUploadMap] = useState<Map<number, number>>(new Map());

  const fetchUploadDays = async () => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 1).toISOString();

    const { data } = await supabase
      .from('uploads')
      .select('uploaded_at')
      .eq('user_id', userId)
      .gte('uploaded_at', start)
      .lt('uploaded_at', end)
      .lte('uploaded_at', new Date().toISOString());

    if (data) {
      const map = new Map<number, number>();
      data.forEach((u) => {
        const day = new Date(u.uploaded_at).getDate();
        map.set(day, (map.get(day) || 0) + 1);
      });
      setUploadMap(map);
    }
  };

  useEffect(() => {
    fetchUploadDays();
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      fetchUploadDays();
    }, [year, month])
  );

  const goToPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month >= now.getMonth()) return;
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const canGoNext = !isCurrentMonth;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today.getDate();

  const weekdays = [
    t().calendar.sun, t().calendar.mon, t().calendar.tue,
    t().calendar.wed, t().calendar.thu, t().calendar.fri, t().calendar.sat,
  ];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = format(t().calendar.yearMonth, { year, month: month + 1 });
  const totalUploads = Array.from(uploadMap.values()).reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <Text style={styles.navText}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          disabled={!canGoNext}
        >
          <Text style={[styles.navText, !canGoNext && styles.navDisabled]}>{'→'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {weekdays.map((day, i) => (
          <View key={i} style={styles.weekCell}>
            <Text style={[styles.weekText, i === 0 && styles.sundayText]}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={styles.cell} />;
          }

          const count = uploadMap.get(day) || 0;
          const isToday = isCurrentMonth && day === todayDate;
          const isFuture = isCurrentMonth && day > todayDate;

          return (
            <View
              key={day}
              style={[
                styles.cell,
                count > 0 && styles.cellUploaded,
                isToday && styles.cellToday,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  count > 0 && styles.dayUploaded,
                  isFuture && styles.dayFuture,
                  i % 7 === 0 && count === 0 && styles.sundayText,
                ]}
              >
                {day}
              </Text>
              {count > 0 && (
                <Text style={styles.pointText}>+{count}P</Text>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.countText}>
        {format(t().calendar.monthlyCount, { count: totalUploads })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 18,
    color: colors.text,
  },
  navDisabled: {
    color: colors.textDisabled,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  weekText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sundayText: {
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
    borderRadius: radius.sm,
  },
  cellUploaded: {
    backgroundColor: colors.primaryLight,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 13,
    color: colors.text,
  },
  dayUploaded: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  dayFuture: {
    color: colors.textDisabled,
  },
  pointText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: -1,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
