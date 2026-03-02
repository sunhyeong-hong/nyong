import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius } from '../lib/theme';

interface BirthdayPickerProps {
  initialYear: number;
  initialMonth: number;
  onDateChange: (year: number, month: number) => void;
}

const currentYear = new Date().getFullYear();
const MIN_YEAR = 2000;

export function BirthdayPicker({ initialYear, initialMonth, onDateChange }: BirthdayPickerProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const updateYear = (delta: number) => {
    let next = year + delta;
    if (next > currentYear) next = MIN_YEAR;
    if (next < MIN_YEAR) next = currentYear;
    setYear(next);
    onDateChange(next, month);
  };

  const updateMonth = (delta: number) => {
    let next = month + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setMonth(next);
    onDateChange(year, next);
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateYear(1)}>
          <Text style={styles.arrow}>▲</Text>
        </TouchableOpacity>
        <View style={styles.valueBox}>
          <Text style={styles.valueText}>{year}</Text>
        </View>
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateYear(-1)}>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.unitLabel}>년</Text>
      </View>

      <Text style={styles.separator}>/</Text>

      <View style={styles.column}>
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateMonth(1)}>
          <Text style={styles.arrow}>▲</Text>
        </TouchableOpacity>
        <View style={styles.valueBoxSmall}>
          <Text style={styles.valueText}>{pad(month)}</Text>
        </View>
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateMonth(-1)}>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.unitLabel}>월</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  column: {
    alignItems: 'center',
  },
  arrowButton: {
    width: 60,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 18,
    color: colors.primary,
  },
  valueBox: {
    width: 80,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryHighlight,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  valueBoxSmall: {
    width: 60,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryHighlight,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: -20,
  },
  unitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
