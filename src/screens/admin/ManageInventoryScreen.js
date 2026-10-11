import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, OutlineButton, PrimaryButton, StatusBadge } from '../../components/UIKit';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { listInventory, removeBook, saveBook } from './adminService';

const blank = { title: '', author: '', status: 'available' };
export default function ManageInventoryScreen() {
  const [books, setBooks] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [modal, setModal] = useState(false); const [form, setForm] = useState(blank); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setBooks(await listInventory()); } catch (e) { setError(e.message || 'Unable to load inventory.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const edit = (book = null) => { setForm(book ? { id: book.id, title: book.title, author: book.author || '', status: book.status || 'available' } : blank); setModal(true); };
  const submit = async () => { if (!form.title.trim()) return; setSaving(true); try { await saveBook(form); setModal(false); await load(); } catch (e) { setError(e.message || 'Could not save book.'); } finally { setSaving(false); } };
  const confirmDelete = (book) => Alert.alert('Remove book', `Remove “${book.title}” from inventory?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { try { await removeBook(book.id); load(); } catch (e) { setError(e.message || 'Could not remove book.'); } } }]);
  return <SafeAreaView style={styles.safe} edges={['bottom']}>
    <FlatList data={books} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshing={loading} onRefresh={load}
      ListHeaderComponent={<><View style={styles.header}><View><Text style={typography.title}>Book inventory</Text><Text style={typography.muted}>{books.length} titles</Text></View><TouchableOpacity style={styles.addButton} onPress={() => edit()}><Ionicons name="add" size={20} color={colors.white} /><Text style={styles.addText}>Add book</Text></TouchableOpacity></View>{error ? <Text style={styles.error}>{error}</Text> : null}{loading && !books.length ? <ActivityIndicator color={colors.primary} /> : null}</>}
      ListEmptyComponent={!loading ? <EmptyState message="No books in inventory. Add a title to get started." /> : null}
      renderItem={({ item }) => <Card style={styles.row}><View style={styles.book}><Text style={typography.subtitle}>{item.title}</Text><Text style={typography.muted}>{item.author || 'Unknown author'}</Text><StatusBadge label={item.status || 'available'} tone={item.status === 'available' ? 'success' : 'warning'} /></View><View style={styles.actions}><TouchableOpacity onPress={() => edit(item)} accessibilityLabel="Edit book"><Ionicons name="create-outline" size={22} color={colors.primary} /></TouchableOpacity><TouchableOpacity onPress={() => confirmDelete(item)} accessibilityLabel="Remove book"><Ionicons name="trash-outline" size={22} color={colors.danger} /></TouchableOpacity></View></Card>}
    />
    <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}><View style={styles.backdrop}><View style={styles.modal}><Text style={typography.title}>{form.id ? 'Edit book' : 'Add a book'}</Text><TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.textMuted} value={form.title} onChangeText={(title) => setForm((f) => ({ ...f, title }))} /><TextInput style={styles.input} placeholder="Author" placeholderTextColor={colors.textMuted} value={form.author} onChangeText={(author) => setForm((f) => ({ ...f, author }))} /><View style={styles.modalActions}><View style={styles.half}><OutlineButton title="Cancel" onPress={() => setModal(false)} /></View><View style={styles.half}><PrimaryButton title="Save" onPress={submit} loading={saving} disabled={!form.title.trim() || saving} /></View></View></View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, list: { padding: spacing.lg, flexGrow: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }, addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: radius.md, gap: spacing.xs }, addText: { color: colors.white, fontWeight: '700' }, row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, book: { flex: 1, gap: spacing.xs }, actions: { flexDirection: 'row', gap: spacing.md }, error: { color: colors.danger, marginBottom: spacing.sm }, backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)' }, modal: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text }, modalActions: { flexDirection: 'row', gap: spacing.sm }, half: { flex: 1 } });
