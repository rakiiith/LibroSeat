import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  PanResponder,
  Pressable,
  Platform,
  PixelRatio,
  ScrollView,
  StatusBar,
  Image,
  Text,
  View,
} from 'react-native';
import { GLView } from 'expo-gl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createLibraryScene } from './libraryScene';
import { FLOOR_AREAS } from './floorAreaConfig';
import { styles, COLORS } from './SLIITLibrary3D.styles';

const FLOORS = ['Ground Floor', '1st Floor', '2nd Floor'];

/**
 * Expo-native 3D library explorer.
 * Props:
 *   initialFloor: 0 | 1 | 2
 *   onContinue: ({ floorIndex, floorName }) => navigation.navigate(...)
 */
export default function SLIITLibrary3D({ initialFloor = 0, onContinue, navigation }) {
  const validInitialFloor = Number.isInteger(initialFloor) && initialFloor >= 0 && initialFloor < FLOORS.length
    ? initialFloor
    : 0;
  const isFocused = useIsFocused();
  const sceneRef = useRef(null);
  const initializationFrameRef = useRef(null);
  const renderLoopRef = useRef({ running: false, frame: null, lastTime: 0, api: null });
  const screenActiveRef = useRef(false);
  const startRenderLoopRef = useRef(null);
  const mountedRef = useRef(true);
  const gestureRef = useRef({ yaw: 0.72, pitch: 0.58, radius: 31, startX: 0, startY: 0, lastPinch: 0, touchCount: 0 });
  const [floor, setFloor] = useState(validInitialFloor);
  const [glSize, setGlSize] = useState({ width: 0, height: 0 });
  const [area, setArea] = useState(FLOOR_AREAS[validInitialFloor]?.[0] || FLOOR_AREAS[0][0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seatModal, setSeatModal] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState || 'active');

  const initialFloorRef = useRef(validInitialFloor);
  const currentFloorRef = useRef(floor);
  currentFloorRef.current = floor;
  const areas = FLOOR_AREAS[floor] || FLOOR_AREAS[0];
  const modelHeight = Math.max(glSize.height - 405, 220);

  const stopRenderLoop = useCallback(() => {
    const loop = renderLoopRef.current;
    loop.running = false;
    loop.lastTime = 0;
    if (loop.frame != null) cancelAnimationFrame(loop.frame);
    loop.frame = null;
  }, []);

  const startRenderLoop = useCallback((api) => {
    const loop = renderLoopRef.current;
    if (!api || !mountedRef.current || !screenActiveRef.current || loop.running) return;
    loop.api = api;
    loop.running = true;
    loop.lastTime = 0;
    let firstFrame = true;

    const tick = (time) => {
      if (!loop.running || !mountedRef.current || sceneRef.current !== api) {
        loop.running = false;
        loop.frame = null;
        return;
      }
      const delta = loop.lastTime ? Math.min(time - loop.lastTime, 50) : 1000 / 60;
      loop.lastTime = time;
      try {
        const renderedCalls = api.render(time, delta);
        if (firstFrame) {
          firstFrame = false;
          if (renderedCalls === 0) {
            throw new Error('The GL renderer started but drew no scene objects. Turn off remote JS debugging and reload Expo Go.');
          }
        }
        loop.frame = requestAnimationFrame(tick);
      } catch (renderError) {
        stopRenderLoop();
        if (sceneRef.current === api) {
          sceneRef.current = null;
          try { api.dispose(); } catch (_) { /* Keep the original rendering error visible. */ }
          setError(renderError?.message || 'The device could not render the 3D scene.');
          setLoading(false);
        }
      }
    };
    loop.frame = requestAnimationFrame(tick);
  }, [stopRenderLoop]);
  startRenderLoopRef.current = startRenderLoop;

  const handleContextCreate = useCallback((gl) => {
    let attempts = 0;
    const initializeWhenSized = () => {
      if (!mountedRef.current) return;
      const width = Number(gl?.drawingBufferWidth) || glSize.width * PixelRatio.get();
      const height = Number(gl?.drawingBufferHeight) || glSize.height * PixelRatio.get();
      if (width < 1 || height < 1) {
        attempts += 1;
        if (attempts < 90) {
          // expo-gl can deliver onContextCreate before the native surface has
          // completed layout. Wait for its drawing buffer instead of failing
          // the whole screen on that first zero-sized measurement.
          initializationFrameRef.current = requestAnimationFrame(initializeWhenSized);
          return;
        }
        setError('The device GL surface did not become ready. Close this screen and reopen it.');
        setLoading(false);
        return;
      }

      try {
        stopRenderLoop();
        sceneRef.current?.dispose?.();
        sceneRef.current = null;
        const api = createLibraryScene(
          gl,
          currentFloorRef.current ?? initialFloorRef.current,
          {
            mobileOptimized: Platform.OS !== 'web',
            width,
            height,
          }
        );
        sceneRef.current = api;
        if (screenActiveRef.current) startRenderLoopRef.current?.(api);
        setError('');
        setLoading(false);
      } catch (initializationError) {
        // Keep handled GL setup errors in the screen UI. console.error triggers
        // Expo Go's blocking development error overlay even though this is caught.
        setError(initializationError?.message || 'Unable to initialise the 3D library scene.');
        setLoading(false);
      }
    };

    initializationFrameRef.current = requestAnimationFrame(initializeWhenSized);
  }, [glSize.height, glSize.width, stopRenderLoop]);

  const handleRootLayout = useCallback(({ nativeEvent: { layout } }) => {
    if (layout.width > 0 && layout.height > 0) {
      setGlSize((current) => current.width === layout.width && current.height === layout.height
        ? current
        : { width: layout.width, height: layout.height });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (initializationFrameRef.current != null) cancelAnimationFrame(initializationFrameRef.current);
      stopRenderLoop();
      sceneRef.current?.dispose?.();
      sceneRef.current = null;
    };
  }, [stopRenderLoop]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const active = isFocused && appState === 'active';
    screenActiveRef.current = active;
    if (active && sceneRef.current) startRenderLoop(sceneRef.current);
    else stopRenderLoop();
  }, [appState, isFocused, startRenderLoop, stopRenderLoop]);

  useEffect(() => {
    if (!sceneRef.current || !glSize.width || !glSize.height) return;
    sceneRef.current.resize(glSize.width * PixelRatio.get(), Math.max(glSize.height - 405, 220) * PixelRatio.get());
  }, [glSize.height, glSize.width]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setFloor(floor);
    gestureRef.current = {
      ...gestureRef.current,
      yaw: 0.72,
      pitch: 0.58,
      radius: sceneRef.current.state.radius,
    };
  }, [floor]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event, gesture) => {
      const api = sceneRef.current;
      if (api) {
        api.beginInteraction();
        gestureRef.current.yaw = api.state.yaw;
        gestureRef.current.pitch = api.state.pitch;
        gestureRef.current.radius = api.state.radius;
      }
      gestureRef.current.startX = gesture.dx;
      gestureRef.current.startY = gesture.dy;
      const touches = event.nativeEvent.touches || [];
      gestureRef.current.touchCount = touches.length;
      if (touches.length >= 2) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        gestureRef.current.lastPinch = Math.sqrt(dx * dx + dy * dy);
      }
    },
    onPanResponderMove: (event, gesture) => {
      const api = sceneRef.current;
      if (!api) return;
      const touches = event.nativeEvent.touches || [];
      if (touches.length >= 2) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (gestureRef.current.touchCount < 2 || !gestureRef.current.lastPinch) {
          gestureRef.current.yaw = api.state.yaw;
          gestureRef.current.pitch = api.state.pitch;
          gestureRef.current.radius = api.state.radius;
          gestureRef.current.lastPinch = distance;
          gestureRef.current.touchCount = touches.length;
          return;
        }
        const previous = gestureRef.current.lastPinch;
        const radius = gestureRef.current.radius * (previous / Math.max(distance, 1));
        gestureRef.current.lastPinch = distance;
        gestureRef.current.touchCount = touches.length;
        gestureRef.current.radius = Math.min(48, Math.max(13, radius));
        api.setOrbit(gestureRef.current.yaw, gestureRef.current.pitch, gestureRef.current.radius);
      } else {
        if (gestureRef.current.touchCount >= 2) {
          gestureRef.current.yaw = api.state.yaw;
          gestureRef.current.pitch = api.state.pitch;
          gestureRef.current.radius = api.state.radius;
          gestureRef.current.startX = gesture.dx;
          gestureRef.current.startY = gesture.dy;
          gestureRef.current.lastPinch = 0;
          gestureRef.current.touchCount = touches.length;
          return;
        }
        const yaw = gestureRef.current.yaw - (gesture.dx - gestureRef.current.startX) * 0.006;
        const pitch = gestureRef.current.pitch + (gesture.dy - gestureRef.current.startY) * 0.004;
        gestureRef.current.touchCount = touches.length;
        api.setOrbit(yaw, pitch, gestureRef.current.radius);
      }
    },
    onPanResponderRelease: () => {
      gestureRef.current.lastPinch = 0;
      gestureRef.current.touchCount = 0;
      sceneRef.current?.endInteraction();
    },
    onPanResponderTerminate: () => {
      gestureRef.current.lastPinch = 0;
      gestureRef.current.touchCount = 0;
      sceneRef.current?.endInteraction();
    },
    onPanResponderTerminationRequest: () => true,
  }), []);

  const selectArea = useCallback((item) => {
    setArea(item);
    sceneRef.current?.focus(item.camera, item.target);
  }, []);

  const changeFloor = (index) => {
    setFloor(index);
    setArea(FLOOR_AREAS[index]?.[0] || FLOOR_AREAS[0][0]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.root} onLayout={handleRootLayout}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {glSize.width > 0 && glSize.height > 0 && (
        <GLView
          style={[styles.glView, { width: glSize.width, height: modelHeight }]}
          msaaSamples={0}
          onContextCreate={handleContextCreate}
        />
      )}

      {/* Transparent touch layer: one-finger orbit and two-finger pinch zoom. */}
      <View style={styles.gestureLayer} {...panResponder.panHandlers} />

      <View style={styles.brandBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.goBack()} style={styles.brandButton}>
          <Ionicons name="arrow-back" size={21} color="#17333C" />
        </Pressable>
        <View style={styles.brandLockup}>
          <Ionicons name="book" size={23} color={COLORS.teal} />
          <Text style={styles.brandName}>LibroSeat</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => navigation?.navigate('Home', { screen: 'Notifications' })} style={styles.brandButton}>
          <Ionicons name="notifications-outline" size={21} color="#17333C" />
        </Pressable>
      </View>

      <View style={styles.pageHeader} pointerEvents="box-none">
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.pageTitle}>Choose a study space</Text>
            <Text style={styles.pageSubtitle}>Explore the library and select a floor</Text>
          </View>
          <View style={styles.headingIcon}><Ionicons name="business-outline" size={21} color={COLORS.teal} /></View>
        </View>
        <View style={styles.floorTabs}>
          {FLOORS.map((name, index) => (
            <Pressable key={name} onPress={() => changeFloor(index)} style={[styles.floorTab, floor === index && styles.activeTab]}>
              <Text style={[styles.floorTabText, floor === index && styles.activeTabText]}>{name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.areaStripWrap}>
        <Text style={styles.sectionTitle}>Study areas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.areaStrip}>
          {areas.map((item) => (
            <Pressable key={item.id} style={[styles.areaCard, area.id === item.id && styles.activeAreaCard]} onPress={() => selectArea(item)}>
              <View style={styles.areaPreview}>
                <Image source={item.image} resizeMode="cover" style={styles.areaImage} />
                <View style={styles.areaIconBadge}><Text style={styles.areaIcon}>{item.icon}</Text></View>
              </View>
              <Text numberOfLines={1} style={styles.areaTitle}>{item.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.continueWrap}>
        <Pressable
          style={styles.continueButton}
          onPress={() => onContinue
            ? onContinue({ floorIndex: floor, floorName: FLOORS[floor], areaId: area.id, areaName: area.title })
            : setSeatModal(true)}
        >
          <Text style={styles.continueButtonText}>Continue with selected study area</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2e9bff" />
          <Text style={styles.loadingTitle}>Loading SLIIT Library 3D</Text>
          <Text style={styles.loadingSub}>Preparing the interactive model…</Text>
        </View>
      )}
      {!!error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>3D preview could not start</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorText}>Reload the app and try again. If the problem continues, use a device that supports WebGL.</Text>
        </View>
      )}

      <Modal visible={seatModal} transparent animationType="fade" onRequestClose={() => setSeatModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Continue to seat booking</Text>
            <Text style={styles.modalText}>{FLOORS[floor]} selected.</Text>
            <Text style={styles.modalText}>Pass this selected floor to your existing reading-room and seat-selection screen using the onContinue prop.</Text>
            <Pressable style={styles.modalButton} onPress={() => setSeatModal(false)}>
              <Text style={styles.modalButtonText}>Back to 3D View</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}
