import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../supabase/supabaseConfig';
import { normalizeSeat, seatHasFloor } from './seatData';
import { LIBRARY_CLOSE_TIME, LIBRARY_OPEN_TIME } from '../../config/libraryHours';

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchSeats() {
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .order('seat_number');
  if (error) throw error;
  return (data ?? []).map(normalizeSeat);
}

const formatTime = value => String(value || '').slice(0, 5);

function makeTimeRange(start, end) {
  const normalizedStart = formatTime(start);
  const normalizedEnd = formatTime(end);
  return { start: normalizedStart, end: normalizedEnd, label: `${normalizedStart} - ${normalizedEnd}` };
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

async function fetchReservedSeatIds(bookingDate, timeSlot) {
  const { data, error } = await supabase
    .from('seat_reservations')
    .select('seat_id, start_time, end_time')
    .eq('reservation_date', bookingDate)
    .in('status', ['reserved', 'checked_in']);
  if (error) throw error;

  const requestedStart = timeToMinutes(timeSlot.start);
  const requestedEnd = timeToMinutes(timeSlot.end);
  return (data ?? [])
    .filter(row => timeToMinutes(row.start_time) < requestedEnd && timeToMinutes(row.end_time) > requestedStart)
    .map(row => String(row.seat_id));
}

function subscribeToSeatAvailability(onChange) {
  const channel = supabase
    .channel('seat-availability', { config: { private: false } })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_reservations' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

const C = {
  bg: '#F6F9FA', white: '#FFFFFF', teal: '#118B8E', dark: '#17333C',
  muted: '#71838A', faint: '#9AA9AE', border: '#E1E9EB', pale: '#E7F6F5',
  green: '#37B879', greenBg: '#E6F6EC', red: '#F45C61', redBg: '#FFE7E8',
  gray: '#AAB3BA', grayBg: '#EEF1F3',
};

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString(undefined, options);
}

function validateTimeRange(range, date) {
  if (!range?.start || !range?.end || !/^\d{2}:\d{2}$/.test(range.start) || !/^\d{2}:\d{2}$/.test(range.end)) {
    return 'Choose both a start time and an end time.';
  }
  const start = timeToMinutes(range.start);
  const end = timeToMinutes(range.end);
  const open = timeToMinutes(LIBRARY_OPEN_TIME);
  const close = timeToMinutes(LIBRARY_CLOSE_TIME);
  if (start < open || start >= close || end <= open || end > close) {
    return `Choose a time within library hours (${LIBRARY_OPEN_TIME}–${LIBRARY_CLOSE_TIME}).`;
  }
  if (end <= start) return 'End time must be later than start time.';
  if (date === localDateString()) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (start <= currentMinutes) return 'Start time must be later than the current time.';
  }
  return '';
}

function durationLabel(range) {
  if (!range?.start || !range?.end) return '—';
  const duration = timeToMinutes(range.end) - timeToMinutes(range.start);
  if (duration <= 0) return '—';
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return [hours ? `${hours} hr${hours === 1 ? '' : 's'}` : '', minutes ? `${minutes} min` : ''].filter(Boolean).join(' ');
}

function pickerDateForTime(value) {
  const [hours, minutes] = formatTime(value).split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function timeFromPickerDate(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function seatRowLabel(seat) {
  if (seat.row_label) return String(seat.row_label).toUpperCase();
  return String(seat.seat_number ?? '').match(/^[A-Za-z]+/)?.[0]?.toUpperCase() || '—';
}

function seatColumn(seat) {
  if (seat.column_number != null) return Number(seat.column_number);
  return Number(String(seat.seat_number ?? '').match(/\d+/)?.[0] || 0);
}

function seatAreaId(seat) {
  const value = seat.study_area_id ?? seat.study_area ?? seat.area_id ?? seat.area_name ?? seat.area;
  if (!value) return null;
  const text = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = text.match(/(?:studyarea|area)(0?[1-3])/);
  if (!match) return null;
  return `study-area-${match[1].padStart(2, '0')}`;
}

function seatGridRows(list) {
  const ordered = [...list].sort((a, b) => seatRowLabel(a).localeCompare(seatRowLabel(b)) || seatColumn(a) - seatColumn(b));
  return Array.from({ length: Math.max(4, Math.ceil(ordered.length / 4)) }, (_, rowIndex) => [
    String.fromCharCode(65 + rowIndex),
    Array.from({ length: 4 }, (_, columnIndex) => ordered[rowIndex * 4 + columnIndex] || null),
  ]);
}

export default function SelectSeatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [seats, setSeats] = useState([]);
  const [reservedIds, setReservedIds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [floor, setFloor] = useState(() => {
    const initialFloor = route?.params?.floor ?? route?.params?.selectedFloor;
    return initialFloor == null ? 'All' : String(initialFloor);
  });
  const [areaId, setAreaId] = useState(route?.params?.areaId || 'study-area-01');
  const [areaName, setAreaName] = useState(route?.params?.areaName || 'Study Area 01');
  const [bookingDate, setBookingDate] = useState(route?.params?.bookingDate || localDateString());
  const [timeSlot, setTimeSlot] = useState(() => makeTimeRange(
    route?.params?.startTime || '10:00',
    route?.params?.endTime || '11:00',
  ));
  const [draftTime, setDraftTime] = useState(() => makeTimeRange(
    route?.params?.startTime || '10:00',
    route?.params?.endTime || '11:00',
  ));
  const [timeError, setTimeError] = useState('');
  const [activePicker, setActivePicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const selectedTimeError = validateTimeRange(timeSlot, bookingDate);
  const draftTimeError = validateTimeRange(draftTime, bookingDate);

  const openTimePicker = () => {
    setDraftTime({ ...timeSlot });
    setTimeError('');
    setActivePicker('time');
  };

  const updateDraftTime = (field, value) => {
    const next = makeTimeRange(
      field === 'start' ? value : draftTime.start,
      field === 'end' ? value : draftTime.end,
    );
    setDraftTime(next);
    setTimeError(validateTimeRange(next, bookingDate));
  };

  const confirmTime = () => {
    const validation = validateTimeRange(draftTime, bookingDate);
    setTimeError(validation);
    if (validation) return;
    const changed = draftTime.start !== timeSlot.start || draftTime.end !== timeSlot.end;
    setTimeSlot(makeTimeRange(draftTime.start, draftTime.end));
    if (changed) setSelected(null);
    setActivePicker(null);
  };

  const loadSeats = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [seatRows, bookedIds] = await Promise.all([
        fetchSeats(),
        fetchReservedSeatIds(bookingDate, timeSlot),
      ]);
      setSeats(seatRows);
      setReservedIds(bookedIds);
      setSelected(current => {
        const selectedId = current?.id ?? route?.params?.selectedSeatId;
        return seatRows.find(seat => seat.is_active !== false
          && String(seat.id) === String(selectedId)
          && !bookedIds.includes(String(seat.id))) ?? null;
      });
    } catch (e) {
      setError(e.message || 'Unable to load seats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingDate, timeSlot.start, timeSlot.end, route?.params?.selectedSeatId]);

  useFocusEffect(useCallback(() => {
    loadSeats();
    const unsubscribe = subscribeToSeatAvailability(() => loadSeats(true));
    return unsubscribe;
  }, [loadSeats]));

  useEffect(() => {
    const params = route?.params;
    const selectedFloor = params?.floor ?? params?.selectedFloor;
    if (selectedFloor != null) setFloor(String(selectedFloor));
    if (params?.areaId) setAreaId(params.areaId);
    if (params?.areaName) setAreaName(params.areaName);
    if (selectedFloor != null || params?.areaId) setSelected(null);
  }, [route?.params?.floor, route?.params?.selectedFloor, route?.params?.areaId, route?.params?.areaName]);

  const visibleSeats = useMemo(() => seats
    .filter(seat => floor === 'All' || seatHasFloor(seat, floor))
    // Older seat records have no study-area column. Keep those real seats
    // selectable, while respecting explicit area tags when the schema has them.
    .filter(seat => !seatAreaId(seat) || seatAreaId(seat) === areaId),
  [seats, floor, areaId]);

  const seatRows = useMemo(() => seatGridRows(visibleSeats), [visibleSeats]);

  const continueBooking = () => {
    if (!selected) return;
    navigation.navigate('SeatConfirmation', {
      seat: selected,
      room: selected.reading_rooms?.name,
      floor: selected.reading_rooms?.floor ?? (floor === 'All' ? undefined : floor),
      studyAreaId: areaId,
      studyArea: areaName,
      bookingDate,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
    });
  };

  const openNotifications = () => navigation.navigate('Home', { screen: 'Notifications' });

  const renderSeat = seat => {
    const unavailable = seat.is_active === false;
    const isSelected = String(selected?.id) === String(seat.id);
    const isReserved = reservedIds.includes(String(seat.id));
    return (
      <SeatCard
        key={seat.id}
        seat={seat}
        selected={isSelected}
        reserved={isReserved}
        unavailable={unavailable}
        onPress={() => setSelected(current => String(current?.id) === String(seat.id) ? null : seat)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Home" onPress={() => navigation.navigate('Home', { screen: 'HomeTab' })} style={styles.topIcon}>
          <Ionicons name="menu-outline" size={23} color={C.dark} />
        </Pressable>
        <View style={styles.brandLockup}>
          <Ionicons name="book" size={23} color={C.teal} />
          <Text style={styles.brandName}>LibroSeat</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={openNotifications} style={styles.topIcon}>
          <Ionicons name="notifications-outline" size={21} color={C.dark} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Find Your Study Space</Text>
        <Text style={styles.subtitle}>Choose a date and time, then select an available seat</Text>

      <View style={styles.filtersCard}>
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeField}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Pressable style={styles.selector} onPress={() => setActivePicker('date')}>
                <Ionicons name="calendar-outline" size={17} color={C.teal} />
                <Text numberOfLines={1} style={styles.selectorValue}>{formatDate(bookingDate)}</Text>
              </Pressable>
            </View>
            <View style={styles.dateTimeField}>
              <Text style={styles.fieldLabel}>Booking Time</Text>
              <Pressable style={styles.selector} onPress={openTimePicker}>
                <Ionicons name="time-outline" size={17} color={C.teal} />
                <Text numberOfLines={1} style={styles.selectorValue}>{timeSlot.label}</Text>
                <Ionicons name="chevron-down" size={14} color={C.muted} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.legend}>
          <Legend color={C.green} label="Available" />
          <Legend color={C.teal} label="Selected" />
          <Legend color={C.red} label="Reserved" />
          <Legend color={C.gray} label="Unavailable" />
        </View>

        <View style={styles.roomHeading}>
          <Text numberOfLines={1} style={styles.roomHeadingTitle}>
            {floor === 'All' ? 'All Floors' : floor} · {areaName}
          </Text>
          <Text style={styles.seatTotal}>{visibleSeats.length} seats</Text>
        </View>

        {loading ? (
          <View style={styles.state}><ActivityIndicator size="large" color={C.teal} /><Text style={styles.stateText}>Loading seats...</Text></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => loadSeats(true)} style={styles.retryButton}>
              {refreshing ? <ActivityIndicator size="small" color={C.red} /> : <Text style={styles.retryText}>Try again</Text>}
            </Pressable>
          </View>
        ) : seatRows.length ? (
          <View style={styles.seatMap}>
            {seatRows.map(([label, rowSeats]) => (
              <View key={label} style={styles.seatRow}>
                <Text style={styles.rowLabel}>{label}</Text>
                <View style={styles.rowSeats}>
                  {rowSeats.map((seat, index) => seat
                    ? renderSeat(seat)
                    : <View key={`empty-${label}-${index}`} accessibilityLabel="No seat configured" style={[styles.seat, styles.seatPlaceholder]} />)}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="grid-outline" size={25} color={C.teal} />
            <Text style={styles.emptyTitle}>{seats.length ? 'No seats in this area yet' : 'No seats found'}</Text>
            <Text style={styles.emptyText}>No registered seats match this floor and study area.</Text>
          </View>
        )}
        <View style={{ height: 18 }} />
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected || loading || !!error || !!selectedTimeError }}
          disabled={!selected || loading || !!error || !!selectedTimeError}
          onPress={continueBooking}
          style={({ pressed }) => [styles.continueButton, (!selected || loading || !!error || !!selectedTimeError) && styles.continueDisabled, pressed && styles.continuePressed]}
        >
          <Text style={styles.continueText}>Continue with Selected Seat</Text>
          <Ionicons name="arrow-forward" size={19} color={C.white} />
        </Pressable>
      </View>

      <View style={[styles.bottomTabs, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <BottomTab icon="home-outline" label="Home" onPress={() => navigation.navigate('Home', { screen: 'HomeTab' })} />
        <BottomTab icon="grid-outline" label="Seats" active onPress={() => navigation.navigate('SeatAvailability')} />
        <BottomTab icon="calendar-outline" label="Bookings" onPress={() => navigation.navigate('MyReservations')} />
        <BottomTab icon="person-outline" label="Account" onPress={() => navigation.navigate('Home', { screen: 'Profile' })} />
      </View>

      <CalendarPicker
        visible={activePicker === 'date'}
        selectedDate={bookingDate}
        isDateDisabled={date => date === localDateString() && currentMinutes >= timeToMinutes(LIBRARY_CLOSE_TIME)}
        onClose={() => setActivePicker(null)}
        onSelect={date => {
          setBookingDate(date);
          setSelected(null);
          setActivePicker(null);
        }}
      />

      <BookingTimeSheet
        visible={activePicker === 'time'}
        value={draftTime}
        error={timeError || draftTimeError}
        bookingDate={bookingDate}
        onClose={() => setActivePicker(null)}
        onChange={updateDraftTime}
        onConfirm={confirmTime}
      />
    </SafeAreaView>
  );
}

function SeatCard({ seat, selected, reserved, unavailable, onPress }) {
  const stateLabel = unavailable ? 'unavailable' : reserved ? 'reserved today' : 'available';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: unavailable || reserved }}
      accessibilityLabel={`Seat ${seat.seat_number}, ${stateLabel}`}
      disabled={unavailable || reserved}
      onPress={onPress}
      style={({ pressed }) => [
        styles.seat,
        unavailable ? styles.seatUnavailable : selected ? styles.seatSelected : reserved ? styles.seatReserved : styles.seatAvailable,
        pressed && !unavailable && !reserved && styles.seatPressed,
      ]}
    >
      <Text style={[styles.seatNumber, (selected || reserved) && styles.seatNumberLight]} numberOfLines={1}>
        {seat.seat_number}
      </Text>
    </Pressable>
  );
}

function Legend({ color, label }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function BottomTab({ icon, label, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.bottomTab}>
      <Ionicons name={icon} size={21} color={active ? C.teal : C.muted} />
      <Text style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function BookingTimeSheet({ visible, value, error, bookingDate, onClose, onChange, onConfirm }) {
  const [activeField, setActiveField] = useState('start');
  const [nativePickerField, setNativePickerField] = useState(null);
  const open = timeToMinutes(LIBRARY_OPEN_TIME);
  const close = timeToMinutes(LIBRARY_CLOSE_TIME);

  useEffect(() => {
    if (visible) {
      setActiveField('start');
      setNativePickerField(null);
    }
  }, [visible]);

  const chooseTime = date => {
    const nextValue = timeFromPickerDate(date);
    if (timeToMinutes(nextValue) < open || timeToMinutes(nextValue) > close) return;
    onChange(activeField, nextValue);
    if (Platform.OS === 'android') setNativePickerField(null);
  };

  const hours = Array.from(
    { length: Math.floor(close / 60) - Math.floor(open / 60) + (activeField === 'end' ? 1 : 0) },
    (_, index) => Math.floor(open / 60) + index,
  );
  const selectedValue = value[activeField];
  const selectedHour = Number(selectedValue.slice(0, 2));
  const selectedMinute = Number(selectedValue.slice(3, 5));

  const isWheelTimeDisabled = minute => {
    const candidate = selectedHour * 60 + minute;
    if (candidate < open || candidate > close) return true;
    if (activeField === 'start') {
      if (selectedHour * 60 + minute >= close) return true;
      if (bookingDate === localDateString()) {
        const now = new Date();
        if (candidate <= now.getHours() * 60 + now.getMinutes()) return true;
      }
      return false;
    }
    return candidate <= timeToMinutes(value.start);
  };

  const chooseWheelValue = (field, amount) => {
    const current = value[activeField].split(':').map(Number);
    const next = field === 'hour' ? `${String(amount).padStart(2, '0')}:${String(current[1]).padStart(2, '0')}`
      : `${String(current[0]).padStart(2, '0')}:${String(amount).padStart(2, '0')}`;
    onChange(activeField, next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close time selection" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Booking Time</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={19} color={C.muted} />
            </Pressable>
          </View>

          {['start', 'end'].map(field => (
            <View key={field} style={styles.timeFieldCard}>
              <Text style={styles.timeFieldLabel}>{field === 'start' ? 'Start Time' : 'End Time'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Choose ${field} time`}
                onPress={() => { setActiveField(field); setNativePickerField(field); }}
                style={[styles.timeSelectButton, activeField === field && styles.timeSelectButtonActive]}
              >
                <Ionicons name="time-outline" size={19} color={C.teal} />
                <Text style={styles.timeSelectValue}>{value[field]}</Text>
                <Text style={styles.timeSelectHint}>Tap to change</Text>
              </Pressable>
            </View>
          ))}

          {Platform.OS === 'web' && (
            <View style={styles.wheelPicker}>
              <Text style={styles.wheelTitle}>Select {activeField === 'start' ? 'start' : 'end'} hour and minute</Text>
              <View style={styles.wheelColumns}>
                <View style={styles.wheelColumn}>
                  <Text style={styles.wheelColumnTitle}>Hour</Text>
                  <ScrollView nestedScrollEnabled style={styles.wheelList} showsVerticalScrollIndicator>
                    {hours.map(hour => {
                      const selected = selectedHour === hour;
                      const disabled = activeField === 'start' && bookingDate === localDateString()
                        && hour * 60 + selectedMinute <= new Date().getHours() * 60 + new Date().getMinutes();
                      return (
                        <Pressable key={hour} disabled={disabled} onPress={() => chooseWheelValue('hour', hour)} style={[styles.wheelOption, selected && styles.wheelOptionSelected, disabled && styles.wheelOptionDisabled]}>
                          <Text style={[styles.wheelOptionText, selected && styles.wheelOptionTextSelected]}>{String(hour).padStart(2, '0')}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <View style={styles.wheelColumn}>
                  <Text style={styles.wheelColumnTitle}>Minute</Text>
                  <ScrollView nestedScrollEnabled style={styles.wheelList} showsVerticalScrollIndicator>
                    {Array.from({ length: 60 }, (_, minute) => {
                      const selected = selectedMinute === minute;
                      const disabled = isWheelTimeDisabled(minute);
                      return (
                        <Pressable key={minute} disabled={disabled} onPress={() => chooseWheelValue('minute', minute)} style={[styles.wheelOption, selected && styles.wheelOptionSelected, disabled && styles.wheelOptionDisabled]}>
                          <Text style={[styles.wheelOptionText, selected && styles.wheelOptionTextSelected]}>{String(minute).padStart(2, '0')}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {Platform.OS !== 'web' && nativePickerField && (
            <View style={styles.nativePickerWrap}>
              <DateTimePicker
                value={pickerDateForTime(value[nativePickerField])}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minuteInterval={1}
                onChange={(event, date) => {
                  if (event.type === 'dismissed') {
                    setNativePickerField(null);
                    return;
                  }
                  if (date) chooseTime(date);
                }}
              />
            </View>
          )}

          <View style={styles.durationCard}>
            <View>
              <Text style={styles.durationLabel}>Booking Duration</Text>
              <Text style={styles.durationValue}>{durationLabel(value)}</Text>
            </View>
            <Ionicons name="hourglass-outline" size={22} color={C.teal} />
          </View>

          {!!error && <Text accessibilityRole="alert" style={styles.timeValidation}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !!error }}
            disabled={!!error}
            onPress={onConfirm}
            style={({ pressed }) => [styles.confirmTimeButton, !!error && styles.confirmTimeDisabled, pressed && !error && styles.continuePressed]}
          >
            <Text style={styles.confirmTimeText}>Confirm Time Selection</Text>
            <Ionicons name="checkmark" size={19} color={C.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CalendarPicker({ visible, selectedDate, isDateDisabled, onSelect, onClose }) {
  const [month, setMonth] = useState(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  useEffect(() => {
    if (!visible) return;
    const date = new Date(`${selectedDate}T00:00:00`);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [visible, selectedDate]);

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = localDateString();
  const visibleMonthKey = `${month.getFullYear()}-${String(month.getMonth()).padStart(2, '0')}`;
  const todayMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`;
  const dates = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close calendar" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a date</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={19} color={C.muted} />
            </Pressable>
          </View>

          <View style={styles.calendarMonthRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={visibleMonthKey <= todayMonthKey}
              onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              style={styles.calendarArrow}
            >
              <Ionicons name="chevron-back" size={18} color={visibleMonthKey <= todayMonthKey ? C.faint : C.dark} />
            </Pressable>
            <Text style={styles.calendarMonth}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              style={styles.calendarArrow}
            >
              <Ionicons name="chevron-forward" size={18} color={C.dark} />
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={`weekday-${index}`} style={styles.calendarCell}><Text style={styles.calendarWeekday}>{day}</Text></View>
            ))}
            {dates.map((date, index) => {
              if (!date) return <View key={`blank-${index}`} style={styles.calendarCell} />;
              const value = localDateString(date);
              const disabled = value < today || isDateDisabled?.(value);
              const selected = value === selectedDate;
              const isToday = value === today;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={formatDate(value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelect(value)}
                  style={[styles.calendarCell, styles.calendarDay, selected && styles.calendarDaySelected, isToday && !selected && styles.calendarDayToday, disabled && styles.calendarDayDisabled]}
                >
                  <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected, disabled && styles.calendarDayTextDisabled]}>{date.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.calendarSelected}>{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
        </View>
      </View>
    </Modal>
  );
}

function PickerModal({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close picker" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={19} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerList}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: { width: '100%', maxWidth: 560, height: 58, alignSelf: 'center', paddingHorizontal: 18, backgroundColor: C.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border },
  topIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandName: { color: C.dark, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 },
  title: { color: C.dark, fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.65 },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 14 },
  filtersCard: { width: '100%', padding: 13, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: '#EDF1F2' },
  fieldLabel: { color: C.dark, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  selector: { minHeight: 42, borderRadius: 11, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FCFDFD' },
  selectorValue: { flex: 1, minWidth: 0, color: C.dark, fontSize: 12, fontWeight: '600' },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginTop: 0 },
  dateTimeField: { flex: 1, minWidth: 0 },
  legend: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  roomHeading: { width: '100%', minHeight: 48, paddingHorizontal: 13, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, backgroundColor: '#E7F7F8', marginBottom: 13 },
  roomHeadingTitle: { color: C.dark, fontSize: 13, fontWeight: '800' },
  seatTotal: { color: '#5A9AA0', fontSize: 11, fontWeight: '700' },
  seatMap: { width: '100%', gap: 10, paddingVertical: 4 },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowLabel: { width: 18, color: C.dark, textAlign: 'center', fontSize: 11, fontWeight: '800' },
  rowSeats: { flex: 1, flexDirection: 'row', gap: 8 },
  seat: { flex: 1, minWidth: 0, height: 42, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  seatAvailable: { backgroundColor: C.green, borderColor: C.green },
  seatReserved: { backgroundColor: C.red, borderColor: C.red },
  seatUnavailable: { backgroundColor: C.grayBg, borderColor: '#DDE4E7' },
  seatPlaceholder: { backgroundColor: '#F8FAFA', borderColor: '#E8EEF0', borderStyle: 'dashed' },
  seatSelected: { backgroundColor: C.teal, borderColor: '#087D7B', borderWidth: 2 },
  seatPressed: { opacity: 0.72 },
  seatNumber: { color: C.dark, fontSize: 10, fontWeight: '800' },
  seatNumberLight: { color: C.white },
  state: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 9 },
  stateText: { color: C.muted, fontSize: 12 },
  errorBox: { padding: 14, borderRadius: 14, backgroundColor: C.redBg },
  errorText: { color: '#AA3840', fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: 5 },
  retryText: { color: '#AA3840', fontSize: 12, fontWeight: '800' },
  emptyBox: { minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 22, borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, gap: 8 },
  emptyTitle: { color: C.dark, fontSize: 14, fontWeight: '800' },
  emptyText: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  bottomAction: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 11, paddingBottom: 10, backgroundColor: C.white },
  continueButton: { width: '100%', minHeight: 52, paddingHorizontal: 17, borderRadius: 12, backgroundColor: '#087F83', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  continueDisabled: { backgroundColor: '#8CBDBE' },
  continuePressed: { opacity: 0.86 },
  continueText: { color: C.white, fontSize: 14, fontWeight: '800' },
  bottomTabs: { width: '100%', maxWidth: 560, alignSelf: 'center', minHeight: 58, paddingTop: 7, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomTabLabel: { color: C.muted, fontSize: 10, fontWeight: '600' },
  bottomTabLabelActive: { color: C.teal, fontWeight: '800' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,39,46,0.32)' },
  modalCard: { width: '100%', maxWidth: 560, maxHeight: '78%', alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.white },
  modalHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#CBD5D8', alignSelf: 'center', marginBottom: 15 },
  modalHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { color: C.dark, fontSize: 16, fontWeight: '800' },
  calendarMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calendarArrow: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  calendarMonth: { color: C.dark, fontSize: 15, fontWeight: '800' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  calendarWeekday: { color: C.muted, fontSize: 11, fontWeight: '700' },
  calendarDay: { borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  calendarDaySelected: { backgroundColor: C.teal, borderColor: C.teal },
  calendarDayToday: { borderColor: C.teal },
  calendarDayDisabled: { opacity: 0.42 },
  calendarDayText: { color: C.dark, fontSize: 13, fontWeight: '600' },
  calendarDayTextSelected: { color: C.white, fontWeight: '800' },
  calendarDayTextDisabled: { color: C.faint },
  calendarSelected: { color: C.muted, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  modalClose: { width: 32, height: 32, borderRadius: 11, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pickerList: { flexGrow: 0 },
  pickerOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  pickerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.pale },
  pickerName: { color: C.dark, fontSize: 13, fontWeight: '700' },
  pickerMeta: { color: C.muted, fontSize: 10, marginTop: 3 },
  pickerEmpty: { color: C.muted, paddingVertical: 24, textAlign: 'center' },
});
