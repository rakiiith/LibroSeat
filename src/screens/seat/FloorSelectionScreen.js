import React from 'react';
import SLIITLibrary3D from '../../components/library3d/SLIITLibrary3D';

const FLOOR_NAMES = ['Ground Floor', '1st Floor', '2nd Floor'];

function localDateString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function getInitialFloorIndex(value) {
  if (value == null) return 0;

  const normalized = String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['g', '0', 'ground', 'groundfloor'].includes(normalized)) return 0;
  if (['1', '1st', 'first', 'firstfloor', 'floor1', '1stfloor'].includes(normalized)) return 1;
  if (['2', '2nd', 'second', 'secondfloor', 'floor2', '2ndfloor'].includes(normalized)) return 2;

  return 0;
}

export default function FloorSelectionScreen({ navigation, route }) {
  const routeFloor = route?.params?.floor ?? route?.params?.selectedFloor;
  const initialFloor = getInitialFloorIndex(routeFloor);

  const handleContinue = ({ floorIndex, floorName, areaId, areaName }) => {
    const selectedFloor = FLOOR_NAMES[floorIndex] || floorName || FLOOR_NAMES[initialFloor];
    const previousParams = route?.params ?? {};

    navigation.navigate('SelectSeat', {
      ...previousParams,
      floor: selectedFloor,
      selectedFloor,
      floorIndex,
      areaId,
      areaName,
      bookingDate: previousParams.bookingDate ?? localDateString(),
      startTime: previousParams.startTime ?? '10:00',
      endTime: previousParams.endTime ?? '12:00',
    });
  };

  return <SLIITLibrary3D initialFloor={initialFloor} onContinue={handleContinue} navigation={navigation} />;
}
