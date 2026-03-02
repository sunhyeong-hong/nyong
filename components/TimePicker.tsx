import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { colors, radius } from '../lib/theme';

interface TimePickerProps {
  initialHour: number;
  initialMinute?: number;
  onTimeChange: (hour: number, minute: number) => void;
}

export function TimePicker({ initialHour, onTimeChange }: TimePickerProps) {
  const [hour, setHour] = useState(initialHour);
  const [hourText, setHourText] = useState(initialHour.toString().padStart(2, '0'));

  const pad = (n: number) => n.toString().padStart(2, '0');

  const updateHour = (delta: number) => {
    const next = (hour + delta + 24) % 24;
    setHour(next);
    setHourText(pad(next));
    onTimeChange(next, 0);
  };

  const handleHourChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setHourText(digits);
    const val = parseInt(digits, 10);
    if (!isNaN(val) && val >= 0 && val <= 23) {
      setHour(val);
      onTimeChange(val, 0);
    }
  };

  const handleHourBlur = () => {
    const val = parseInt(hourText, 10);
    if (isNaN(val) || val < 0 || val > 23) {
      setHourText(pad(hour));
    } else {
      const clamped = Math.max(0, Math.min(23, val));
      setHour(clamped);
      setHourText(pad(clamped));
      onTimeChange(clamped, 0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateHour(1)}>
          <Text style={styles.arrow}>▲</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.valueInput}
          value={hourText}
          onChangeText={handleHourChange}
          onBlur={handleHourBlur}
          keyboardType="numeric"
          maxLength={2}
          textAlign="center"
          selectTextOnFocus
        />
        <TouchableOpacity style={styles.arrowButton} onPress={() => updateHour(-1)}>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.unitLabel}>시</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  valueInput: {
    width: 72,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryHighlight,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  unitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
