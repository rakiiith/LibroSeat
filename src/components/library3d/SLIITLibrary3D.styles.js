import { StyleSheet } from 'react-native';

export const COLORS = {
  navy: '#071321',
  navyGlass: 'rgba(5, 14, 25, 0.91)',
  blue: '#087cf0',
  white: '#ffffff',
  muted: '#c2cfdd',
};

export const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 560, backgroundColor: COLORS.navy, overflow: 'hidden' },
  glView: { position: 'absolute', top: 0, left: 0 },
  gestureLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1, backgroundColor: 'transparent' },
  topBar: {
    position: 'absolute', top: 62, left: 12, right: 12, zIndex: 8,
  },
  floorTabs: {
    flexDirection: 'row', gap: 3, padding: 5, borderRadius: 12, backgroundColor: COLORS.navyGlass,
    borderWidth: 1, borderColor: 'rgba(150,175,200,0.38)',
    width: '100%',
  },
  floorTab: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.blue },
  floorTabText: { color: '#f4f7fa', fontSize: 11, fontWeight: '600' },
  activeTabText: { color: '#ffffff', fontWeight: '800' },
  areaStripWrap: { position: 'absolute', left: 8, right: 8, bottom: 66, zIndex: 8 },
  areaStrip: { gap: 8, paddingHorizontal: 3, paddingVertical: 4 },
  areaCard: {
    width: 126, overflow: 'hidden', borderRadius: 10, backgroundColor: 'rgba(4,11,20,0.94)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
  },
  activeAreaCard: { borderWidth: 2, borderColor: '#168aff' },
  areaPreview: { height: 62, overflow: 'hidden', backgroundColor: '#25445c' },
  areaImage: { width: '100%', height: '100%' },
  areaIconBadge: { position: 'absolute', right: 5, top: 5, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3,12,22,0.72)' },
  areaIcon: { fontSize: 13, color: '#ffffff' },
  areaTitle: { color: '#f3f6fa', fontSize: 10, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 3, fontWeight: '600' },
  continueWrap: { position: 'absolute', left: 10, right: 10, bottom: 8, zIndex: 9 },
  continueButton: { minHeight: 46, paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#087f91', borderWidth: 1, borderColor: 'rgba(160,240,244,0.48)', elevation: 5 },
  continueButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20, backgroundColor: '#071321', alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginTop: 10 },
  loadingSub: { color: '#b2c1d1', fontSize: 12, marginTop: 4 },
  errorOverlay: { position: 'absolute', left: 16, right: 16, top: '35%', zIndex: 21, backgroundColor: '#301b25', borderColor: '#a94a5c', borderWidth: 1, borderRadius: 12, padding: 16 },
  errorTitle: { color: '#ffffff', fontWeight: '800', fontSize: 15, marginBottom: 8 },
  errorText: { color: '#f2dbe0', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 520, padding: 22, borderRadius: 16, backgroundColor: '#102238', borderColor: '#536b83', borderWidth: 1 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalText: { color: '#c7d4e2', fontSize: 13, lineHeight: 20, marginBottom: 8 },
  modalButton: { alignSelf: 'flex-start', paddingVertical: 11, paddingHorizontal: 18, backgroundColor: COLORS.blue, borderRadius: 9, marginTop: 10 },
  modalButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
