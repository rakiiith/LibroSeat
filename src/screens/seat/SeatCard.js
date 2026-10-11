
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const C = {
  teal: '#0F8B8D',
  pale: '#E3F5F1',
  white: '#FFFFFF',
  text: '#18323B',
  muted: '#71838A',
  border: '#DFE8EA',
  unavailable: '#E9EEF0',
  red: '#C44C55',
};

export default function SeatCard({
  seat,
  selected = false,
  disabled = false,
  bookedToday = false,
  onPress,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`Seat ${seat.seat_number ?? ''}${bookedToday ? ', has a confirmed booking today; another time may be available' : ', available today'}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <View style={[styles.icon, selected && styles.iconSelected]}>
          <Text style={[styles.iconText, selected && styles.whiteText]}>
            ▦
          </Text>
        </View>
        <View
          style={[
            styles.radio,
            selected && styles.radioSelected,
          ]}
        >
          {selected && <Text style={styles.check}>✓</Text>}
        </View>
      </View>

      <Text style={[styles.number, selected && styles.selectedText]}>
        {seat.seat_number ?? 'Seat'}
      </Text>

      <Text numberOfLines={1} style={styles.room}>
        {seat.reading_rooms?.name ?? 'Reading room'}
      </Text>

      <View style={styles.bottom}>
        <Text numberOfLines={1} style={styles.type}>
          {disabled ? 'Unavailable' : bookedToday ? 'Booked today · check time' : seat.seat_type || 'Available'}
        </Text>
        <View
          style={[
            styles.dot,
            disabled && { backgroundColor: C.red },
            bookedToday && !disabled && { backgroundColor: '#D99531' },
            selected && { backgroundColor: C.teal },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 150,
    padding: 13,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
  },
  selected: {
    borderColor: C.teal,
    borderWidth: 2,
    padding: 12,
    backgroundColor: C.pale,
  },
  disabled: {
    backgroundColor: C.unavailable,
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: C.teal,
  },
  iconText: {
    fontSize: 21,
    color: C.teal,
  },
  whiteText: {
    color: C.white,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  check: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  number: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  selectedText: {
    color: C.teal,
  },
  room: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  type: {
    color: C.muted,
    fontSize: 10,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#39A777',
    marginLeft: 5,
  },
});
