import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ViewToken } from 'react-native';
import { colors, radius } from '../lib/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface TimePickerProps {
  initialHour: number;
  initialMinute: number;
  onTimeChange: (hour: number, minute: number) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);

export function TimePicker({ initialHour, initialMinute, onTimeChange }: TimePickerProps) {
  const hourRef = useRef<FlatList>(null);
  const minuteRef = useRef<FlatList>(null);
  const selectedHour = useRef(initialHour);
  const selectedMinute = useRef(initialMinute);

  useEffect(() => {
    setTimeout(() => {
      hourRef.current?.scrollToOffset({
        offset: initialHour * ITEM_HEIGHT,
        animated: false,
      });
      minuteRef.current?.scrollToOffset({
        offset: initialMinute * ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
  }, [initialHour, initialMinute]);

  const onHourViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const middleIndex = Math.floor(viewableItems.length / 2);
        const item = viewableItems[middleIndex];
        if (item?.item !== undefined) {
          selectedHour.current = item.item;
          onTimeChange(selectedHour.current, selectedMinute.current);
        }
      }
    },
    [onTimeChange]
  );

  const onMinuteViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const middleIndex = Math.floor(viewableItems.length / 2);
        const item = viewableItems[middleIndex];
        if (item?.item !== undefined) {
          selectedMinute.current = item.item;
          onTimeChange(selectedHour.current, selectedMinute.current);
        }
      }
    },
    [onTimeChange]
  );

  const renderHourItem = ({ item }: { item: number }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>
        {item.toString().padStart(2, '0')}
      </Text>
    </View>
  );

  const renderMinuteItem = ({ item }: { item: number }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>
        {item.toString().padStart(2, '0')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <FlatList
          ref={hourRef}
          data={hours}
          renderItem={renderHourItem}
          keyExtractor={(item) => `h-${item}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          style={styles.list}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * 2,
          }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onViewableItemsChanged={onHourViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
        />
        <Text style={styles.unitLabel}>시</Text>
      </View>

      <Text style={styles.separator}>:</Text>

      <View style={styles.column}>
        <FlatList
          ref={minuteRef}
          data={minutes}
          renderItem={renderMinuteItem}
          keyExtractor={(item) => `m-${item}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          style={styles.list}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT * 2,
          }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onViewableItemsChanged={onMinuteViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
        />
        <Text style={styles.unitLabel}>분</Text>
      </View>

      <View style={styles.highlight} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    overflow: 'hidden',
  },
  column: {
    alignItems: 'center',
    width: 80,
  },
  list: {
    height: PICKER_HEIGHT,
    width: 80,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '500',
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginHorizontal: 4,
  },
  unitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    borderRadius: radius.sm,
  },
});
