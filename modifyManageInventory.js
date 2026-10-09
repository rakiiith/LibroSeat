const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'chami', 'OneDrive', 'Desktop', 'LibroSeat', 'src', 'screens', 'admin', 'ManageInventoryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize all line endings to \n for easy replacement
content = content.replace(/\r\n/g, '\n');

// 1. Update handleSaveBook
const handleSaveTarget = `    setSaving(false);
    setModalVisible(false);
    
    // Reset form
    setNewTitle(''); 
    setNewAuthor(''); 
    setNewIsbn(''); 
    setNewLocation(''); 
    setNewCategory(''); 
    setNewTotal(5); 
    setNewAvailable(5);
    
    fetchBooks();
  }`;

const handleSaveReplacement = `    setSaving(false);
    
    setLastSavedBook({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn || '978-0-06-112008-4',
      location: newLocation || 'Shelf 64-B',
      total: newTotal,
      category: newCategory || 'Classic Fiction'
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
  }`;

content = content.replace(handleSaveTarget, handleSaveReplacement);

// 2. Add Success Modal JSX
const modalJsxTarget = `        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>`;

const modalJsxReplacement = `        </KeyboardAvoidingView>
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
                    <Text style={styles.successEntryText}>MARC 21 ENTRY • <Text style={{color: colors.primary}}>#CAT-89240</Text></Text>
                    <Text style={styles.successBookTitle} numberOfLines={1}>{lastSavedBook.title}</Text>
                    <Text style={styles.successBookAuthor}>{lastSavedBook.author} • 2024</Text>
                    <View style={styles.isbnPill}>
                      <Text style={styles.isbnPillText}>{lastSavedBook.isbn}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.successGrid}>
                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="location-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>LOCATION</Text>
                    </View>
                    <Text style={styles.gridItemValue}>{lastSavedBook.location}</Text>
                    <Text style={styles.gridItemSub}>East Wing Stacks</Text>
                  </View>

                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="pricetag-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>CALL NUMBER</Text>
                    </View>
                    <Text style={styles.gridItemValue}>FIC-{(lastSavedBook.author || '').substring(0,3).toUpperCase()}-2024</Text>
                    <Text style={styles.gridItemSub}>Dewey: 813.54</Text>
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
                    <Text style={[styles.gridItemSub, {color: colors.primary}]}>All In Stacks</Text>
                  </View>

                  <View style={styles.successGridItem}>
                    <View style={styles.gridItemHeader}>
                      <Ionicons name="shapes-outline" size={14} color="#4B5563" />
                      <Text style={styles.gridItemLabel}>CATEGORY</Text>
                    </View>
                    <Text style={styles.gridItemValue} numberOfLines={1}>{lastSavedBook.category}</Text>
                    <Text style={styles.gridItemSub}>General Circulation</Text>
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

    </SafeAreaView>`;

content = content.replace(modalJsxTarget, modalJsxReplacement);

// 3. Add Styles
const stylesTarget = `  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});`;

const stylesReplacement = `  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },

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
});`;

content = content.replace(stylesTarget, stylesReplacement);

// Convert back to CRLF before writing back (optional, but good practice on Windows)
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
