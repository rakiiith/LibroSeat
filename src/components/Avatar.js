import React from 'react';
import { View, Text } from 'react-native';
import { initialsOf } from '../theme/ui';

const COLORS = ['#14919B', '#6366F1', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6'];

export default function Avatar({ name, size = 72, style }) {
  let h = 0;
  for (const ch of String(name || '?')) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS[h % COLORS.length],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

export { Avatar };