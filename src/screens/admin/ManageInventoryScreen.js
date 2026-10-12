import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { supabase } from '../../supabase/supabaseClient';

export default function ManageInventoryScreen({ navigation }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Available', 'Checked Out'

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newIsbn, setNewIsbn] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTotal, setNewTotal] = useState(5);
  const [newAvailable, setNewAvailable] = useState(5);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Success Modal State
  const [successVisible, setSuccessVisible] = useState(false);
  const [lastSavedBook, setLastSavedBook] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function handleSaveBook() {
    if (!newTitle || !newAuthor) return;
    setSaving(true);
    const { data, error } = await supabase.from('books').insert({
      title: newTitle,
      author: newAuthor,
      category: newCategory || null,
      is_available: newAvailable > 0
    });
    setSaving(false);
    
    setLastSavedBook({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn || 'N/A',
      location: newLocation || 'Unassigned',
      total: newTotal,
      category: newCategory || 'Uncategorized'
    });
    
    setModalVisible(false);
    setSuccessVisible(true);
    fetchBooks();
  }

  function handleResetForm() {
    setNewTitle(''); 
    setNewAuthor(''); 
    setNewIsbn(''); 
    setNewLocation(''); 
    setNewCategory(''); 
    setNewTotal(5); 
    setNewAvailable(5);
  }

  function handleViewInventory() {
    setSuccessVisible(false);
    handleResetForm();
  }

  function handleAddAnother() {
    setSuccessVisible(false);
    handleResetForm();
    setModalVisible(true);
  }

  async function fetchBooks() {
    setLoading(true);
    const { data, error } = await supabase.from('books').select('*').order('title');
    if (!error && data) {
      setBooks(data);
    }
    setLoading(false);
  }

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (filter === 'Available') return book.is_available;
    if (filter === 'Checked Out') return !book.is_available;
    return true;
  });

  const allCount = books.length;
  const availableCount = books.filter(b => b.is_available).length;
  const checkedOutCount = allCount - availableCount;

  const renderBookItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="book-open-outline" size={24} color="#374151" />
          </View>
          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
              <TouchableOpacity>
                <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.bookAuthor} numberOfLines={1}>{item.author || 'Unknown Author'}</Text>
            
            <View style={styles.statusRow}>
              {item.is_available ? (
                <View style={styles.statusBadgeAvailable}>
                  <View style={styles.statusDotAvailable} />
                  <Text style={styles.statusTextAvailable}>Available</Text>
                </View>
              ) : (
                <View style={styles.statusBadgeOut}>
                  <View style={styles.statusDotOut} />
                  <Text style={styles.statusTextOut}>Out of stock</Text>
                </View>
              )}
              {/* Removed hardcoded dummy stock texts */}
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />
        
        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {item.category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.footerIcons}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="package-variant" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerTitles}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.dashboardTitle}>Inventory</Text>
              <View style={styles.titleDot} />
            </View>
            <Text style={styles.staffPortalText}>Main Wing • Staff Node</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons name="barcode-outline" size={22} color={colors.text} style={styles.iconMargin} />
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={14} color={colors.white} />
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        {/* Title Row */}
        <View style={styles.titleRowMain}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.pageTitle}>Manage Inventory</Text>
            <Text style={styles.itemCountText}>{allCount} items</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.syncedText}>Stacks Synced</Text>
            <View style={styles.syncDot} />
          </View>
        </View>

        {/* Search Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search books, ISBN, author..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <MaterialCommunityIcons name="barcode-scan" size={18} color={colors.primary} style={styles.searchBarcodeIcon} />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'All' && styles.filterChipActive]}
            onPress={() => setFilter('All')}
          >
            <Text style={[styles.filterChipText, filter === 'All' && styles.filterChipTextActive]}>All  {allCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'Available' && styles.filterChipActive]}
            onPress={() => setFilter('Available')}
          >
            <Text style={[styles.filterChipText, filter === 'Available' && styles.filterChipTextActive]}>Available  {availableCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'Checked Out' && styles.filterChipActive]}
            onPress={() => setFilter('Checked Out')}
          >
            <Text style={[styles.filterChipText, filter === 'Checked Out' && styles.filterChipTextActive]}>Checked Out  {checkedOutCount}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Book Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Book</Text>
                <Text style={styles.modalSubtitle}>Enter catalog details for immediate circulation</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.inputLabel}>Book Title <Text style={{color: colors.danger}}>*</Text></Text>
              <TextInput style={styles.formInput} placeholder="e.g. To Kill a Mockingbird" placeholderTextColor={colors.textMuted} value={newTitle} onChangeText={setNewTitle} />

              <Text style={styles.inputLabel}>Author <Text style={{color: colors.danger}}>*</Text></Text>
              <TextInput style={styles.formInput} placeholder="e.g. Harper Lee" placeholderTextColor={colors.textMuted} value={newAuthor} onChangeText={setNewAuthor} />

              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>ISBN / Catalog ID</Text>
                <View style={styles.autoScanBadge}>
                  <Text style={styles.autoScanText}>AUTO-SCAN</Text>
                </View>
              </View>
              <View style={styles.formInputWithIcon}>
                <Ionicons name="barcode-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.formInputInside} placeholder="e.g. PS3523.E32 or 978-0061120084" placeholderTextColor={colors.textMuted} value={newIsbn} onChangeText={setNewIsbn} />
              </View>

              <Text style={styles.inputLabel}>Shelf Location</Text>
              <View style={styles.formInputWithIcon}>
                <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput style={styles.formInputInside} placeholder="e.g. Stacks Level 2, Shelf 64-8" placeholderTextColor={colors.textMuted} value={newLocation} onChangeText={setNewLocation} />
              </View>

              <View style={styles.rowInputs}>
                <View style={{flex: 1, marginRight: spacing.sm}}>
                  <Text style={styles.inputLabel}>Total Copies</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity onPress={() => setNewTotal(Math.max(0, newTotal - 1))} style={styles.numberBtn}><Ionicons name="remove" size={16} color="#1F2937" /></TouchableOpacity>
                    <Text style={styles.numberText}>{newTotal}</Text>
                    <TouchableOpacity onPress={() => setNewTotal(newTotal + 1)} style={styles.numberBtn}><Ionicons name="add" size={16} color="#1F2937" /></TouchableOpacity>
                  </View>
                </View>
                <View style={{flex: 1, marginLeft: spacing.sm}}>
                  <Text style={styles.inputLabel}>Available</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity onPress={() => setNewAvailable(Math.max(0, newAvailable - 1))} style={styles.numberBtn}><Ionicons name="remove" size={16} color="#1F2937" /></TouchableOpacity>
                    <Text style={styles.numberText}>{newAvailable}</Text>
                    <TouchableOpacity onPress={() => setNewAvailable(newAvailable + 1)} style={styles.numberBtn}><Ionicons name="add" size={16} color="#1F2937" /></TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.formInputWithIcon}>
                <TextInput style={styles.formInputInside} placeholder="Select catalog classification..." placeholderTextColor={colors.textMuted} value={newCategory} onChangeText={setNewCategory} />
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} style={{marginRight: 10}} />
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoIconBox}>
                  <MaterialCommunityIcons name="book-open-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.infoText}>
                  New accession labels will be dispatched automatically to Desktop Label Station #2 upon saving.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBook} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.white} /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} style={{marginRight: 6}} />
                    <Text style={styles.saveBtnText}>Save Book</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successVisible} animationType="fade" transparent={false} onRequestClose={handleViewInventory}>
        <SafeAreaView style={styles.successSafe} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.successHeader}>
            <View style={styles.successHeaderLeft}>
              <TouchableOpacity onPress={handleViewInventory} style={{ marginRight: spacing.md }}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.successHeaderTitle}>Item Intake Success</Text>
            </View>
            <View style={styles.successHeaderRight}>
              <Ionicons name="print-outline" size={22} color="#4B5563" style={{ marginRight: spacing.md }} />
              <View style={styles.successAvatar}>
                <Ionicons name="person" size={12} color={colors.white} />
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
            {/* Success Icon */}
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark" size={32} color={colors.white} />
            </View>

            {/* Badge */}
            <View style={styles.syncBadgeContainer}>
              <View style={styles.syncBadgeDot} />
              <Text style={styles.syncBadgeText}>CATALOG SYNCHRONIZED</Text>
            </View>

            <Text style={styles.successMainTitle}>Book Saved Successfully</Text>
            <Text style={styles.successDesc}>
              The record has been indexed into the central library collection and is cleared for shelf placement.
            </Text>

            {/* Book Details Card */}
            {lastSavedBook && (
              <View style={styles.successBookCard}>
                <View style={styles.successBookTop}>
                  <View style={styles.successBookImgPlaceholder}>
                    <MaterialCommunityIcons name="book-open-variant" size={24} color="#90A4AE" />
                  </View>
                  <View style={styles.successBookTopText}>
                    <Text style={styles.successEntryText}>NEW ENTRY</Text>
                    <Text style={styles.successBookTitle} numberOfLines={1}>{lastSavedBook.title}</Text>
                    <Text style={styles.successBookAuthor}>{lastSavedBook.author}</Text>
                    {lastSavedBook.isbn !== 'N/A' && (
                      <View style={styles.isbnPill}>
                        <Text style={styles.isbnPillText}>{lastSavedBook.isbn}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.successGrid}>
                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="location-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>LOCATION</Text>
                    </View>
                    <Text style={styles.gridItemValue}>{lastSavedBook.location}</Text>
                  </View>

                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="pricetag-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>AUTHOR REF</Text>
                    </View>
                    <Text style={styles.gridItemValue}>{(lastSavedBook.author || '').substring(0,3).toUpperCase()}</Text>
                  </View>

                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="albums-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>ACCESSIONS</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={styles.gridItemValue}>{lastSavedBook.total} Copies</Text>
                      <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: 6}} />
                    </View>
                  </View>

                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="shapes-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>CATEGORY</Text>
                    </View>
                    <Text style={styles.gridItemValue} numberOfLines={1}>{lastSavedBook.category}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity style={styles.successActionBtnPrimary} onPress={handleViewInventory}>
              <Ionicons name="reader-outline" size={18} color={colors.white} style={{marginRight: 8}} />
              <Text style={styles.successActionBtnPrimaryText}>View in Inventory</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.successActionBtnSecondary} onPress={handleAddAnother}>
              <Ionicons name="add-square-outline" size={18} color="#1F2937" style={{marginRight: 8}} />
              <Text style={styles.successActionBtnSecondaryText}>Add Another Book</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.returnBtn} onPress={handleViewInventory}>
              <Text style={styles.returnBtnText}>Return to Circulation Desk</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  
  /* Header */
  headerTop: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logoContainer: { 
    width: 36, height: 36, borderRadius: radius.sm, 
    backgroundColor: '#EFFFFE', justifyContent: 'center', alignItems: 'center', 
    marginRight: spacing.sm 
  },
  dashboardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  titleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: 4, marginTop: 2 },
  staffPortalText: { fontSize: 10, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5, marginTop: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginRight: spacing.md },
  profileAvatar: { 
    width: 28, height: 28, borderRadius: 14, 
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' 
  },

  /* Title Row */
  titleRowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginRight: spacing.sm },
  itemCountText: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  syncedText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginRight: 4 },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },

  /* Search Row */
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, height: 44,
    marginRight: spacing.sm,
    borderWidth: 1, borderColor: colors.border
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 14, color: colors.text },
  searchBarcodeIcon: { backgroundColor: '#F3F4F6', padding: 4, borderRadius: 4 },
  addButton: {
    width: 44, height: 44, backgroundColor: colors.primary,
    borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center'
  },

  /* Filters */
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  filterChip: { 
    paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 16, backgroundColor: '#F3F4F6', 
    marginRight: spacing.sm 
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: colors.white },

  /* List */
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  cardTop: { flexDirection: 'row' },
  iconContainer: {
    width: 48, height: 56, borderRadius: radius.sm,
    backgroundColor: '#E5EDF6', justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md
  },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: spacing.sm },
  bookAuthor: { fontSize: 12, color: colors.textMuted, marginBottom: 8, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  
  statusBadgeAvailable: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFFFFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  statusDotAvailable: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 4 },
  statusTextAvailable: { fontSize: 10, fontWeight: '700', color: colors.primary },

  statusBadgeOut: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  statusDotOut: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger, marginRight: 4 },
  statusTextOut: { fontSize: 10, fontWeight: '700', color: colors.danger },

  stockText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 11, color: colors.textMuted, marginLeft: 4, fontWeight: '500', letterSpacing: 0.5 },
  footerIcons: { flexDirection: 'row', alignItems: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl,
    maxHeight: '90%'
  },
  modalDragHandle: { width: 40, height: 4, backgroundColor: '#D1D5DB', borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  
  modalScroll: { paddingBottom: spacing.lg },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  formInput: { 
    backgroundColor: '#F3F6FA', borderRadius: radius.sm, paddingHorizontal: 14, height: 48,
    fontSize: 14, color: colors.text, marginBottom: spacing.lg
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  autoScanBadge: { backgroundColor: '#E5EDF6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  autoScanText: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 0.5 },
  
  formInputWithIcon: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F6FA',
    borderRadius: radius.sm, height: 48, marginBottom: spacing.lg
  },
  inputIcon: { marginLeft: 14, marginRight: 8 },
  formInputInside: { flex: 1, fontSize: 14, color: colors.text, height: '100%', paddingHorizontal: 10 },
  
  rowInputs: { flexDirection: 'row', marginBottom: spacing.lg },
  numberInputContainer: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F6FA', borderRadius: radius.sm, height: 48, paddingHorizontal: 8
  },
  numberBtn: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: '#E5EDF6', justifyContent: 'center', alignItems: 'center' },
  numberText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#E5EDF6', borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.lg },
  infoIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  infoText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },

  modalFooter: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { flex: 1, height: 48, backgroundColor: '#F3F6FA', borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  saveBtn: { flex: 1, height: 48, backgroundColor: '#0033A0', borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

  /* Success Modal */
  successSafe: { flex: 1, backgroundColor: '#FAFBFC' },
  successHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  successHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  successHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  successHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  successAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0033A0', justifyContent: 'center', alignItems: 'center' },
  
  successScroll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, alignItems: 'center' },
  successIconBox: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#1C4ED8', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, shadowColor: '#1C4ED8', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  
  syncBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: spacing.md },
  syncBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1C4ED8', marginRight: 6 },
  syncBadgeText: { fontSize: 10, fontWeight: '700', color: '#1E3A8A', letterSpacing: 0.5 },
  
  successMainTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: spacing.sm, textAlign: 'center' },
  successDesc: { fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  
  successBookCard: { width: '100%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl },
  successBookTop: { flexDirection: 'row', marginBottom: spacing.lg },
  successBookImgPlaceholder: { width: 60, height: 80, backgroundColor: '#F3F4F6', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  successBookTopText: { flex: 1, justifyContent: 'center' },
  successEntryText: { fontSize: 10, fontWeight: '700', color: '#4B5563', letterSpacing: 0.5, marginBottom: 4 },
  successBookTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  successBookAuthor: { fontSize: 13, color: '#4B5563', marginBottom: 8 },
  isbnPill: { alignSelf: 'flex-start', backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  isbnPillText: { fontSize: 10, fontWeight: '700', color: '#3730A3', letterSpacing: 0.5 },
  
  successGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: spacing.md },
  successGridItem: { width: '48%', backgroundColor: '#F9FAFB', borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm, marginRight: '2%' },
  gridItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  gridItemLabel: { fontSize: 10, fontWeight: '600', color: '#4B5563', marginLeft: 4, letterSpacing: 0.5 },
  gridItemValue: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  gridItemSub: { fontSize: 11, color: '#6B7280' },
  
  successActionBtnPrimary: { width: '100%', height: 48, backgroundColor: '#0033A0', borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  successActionBtnPrimaryText: { fontSize: 15, fontWeight: '700', color: colors.white },
  
  successActionBtnSecondary: { width: '100%', height: 48, backgroundColor: '#DBEAFE', borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  successActionBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  
  returnBtn: { padding: spacing.sm },
  returnBtnText: { fontSize: 14, color: '#4B5563', fontWeight: '500' }
});
