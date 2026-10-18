function floorKey(value) {
  if (value == null) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function displayFloor(value) {
  const key = floorKey(value);
  if (['g', '0', 'ground', 'groundfloor'].includes(key)) return 'Ground Floor';
  if (['1', '1st', 'first', 'firstfloor', 'floor1', '1stfloor'].includes(key)) return '1st Floor';
  if (['2', '2nd', 'second', 'secondfloor', 'floor2', '2ndfloor'].includes(key)) return '2nd Floor';
  return value == null || value === '' ? null : String(value);
}

function inferFloor(...values) {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  if (/\bground\b|\bgf\b/.test(text)) return 'Ground Floor';
  if (/\b1st\b|\bfirst\b|\bfloor\s*1\b/.test(text)) return '1st Floor';
  if (/\b2nd\b|\bsecond\b|\bfloor\s*2\b/.test(text)) return '2nd Floor';
  return null;
}

export function normalizeSeat(seat = {}) {
  const roomName = seat.reading_rooms?.name || seat.room || seat.zone || 'Reading Room';
  const floor = displayFloor(
    seat.reading_rooms?.floor ?? seat.floor ?? seat.floor_name ?? inferFloor(seat.zone, seat.room, roomName)
  );
  const seatNumber = seat.seat_number ?? seat.seatNumber ?? '';
  const isBlocked = seat.is_blocked ?? seat.is_available === false;

  return {
    ...seat,
    seat_number: seatNumber,
    row_label: seat.row_label ?? String(seatNumber).match(/^[A-Za-z]+/)?.[0] ?? null,
    column_number: seat.column_number ?? Number(String(seatNumber).match(/\d+/)?.[0] || 0),
    seat_type: seat.seat_type || 'Standard',
    is_active: seat.is_active ?? !isBlocked,
    reading_rooms: { name: String(roomName), floor },
  };
}

export function seatHasFloor(seat, floor) {
  if (!seat?.reading_rooms?.floor) return true;
  return floorKey(seat.reading_rooms.floor) === floorKey(floor);
}
