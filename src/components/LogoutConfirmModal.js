import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';
import { PrimaryButton, OutlineButton } from './UIKit';

export default function LogoutConfirmModal({ visible, title, message, onCancel, onConfirm }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="log-out-outline" size={26} color={colors.danger} />
          </View>
          <Text style={[typography.subtitle, { marginTop: spacing.sm, textAlign: 'center' }]}>{title}</Text>
          <Text style={[typography.muted, { marginTop: spacing.xs, textAlign: 'center' }]}>{message}</Text>
          <View style={styles.buttonRow}>
            <View style={{ flex: 1 }}>
              <OutlineButton title="Cancel" onPress={onCancel} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              {/* Red, not teal — logout is a destructive action */}
              <PrimaryButton title="Log Out" onPress={onConfirm} color={colors.danger} />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.danger + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, alignSelf: 'stretch' },
});