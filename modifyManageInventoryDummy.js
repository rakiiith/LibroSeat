const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'chami', 'OneDrive', 'Desktop', 'LibroSeat', 'src', 'screens', 'admin', 'ManageInventoryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize all line endings to \n
content = content.replace(/\r\n/g, '\n');

// 1. Remove fallback dummy data in handleSaveBook
const handleSaveTarget = `    setLastSavedBook({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn || '978-0-06-112008-4',
      location: newLocation || 'Shelf 64-B',
      total: newTotal,
      category: newCategory || 'Classic Fiction'
    });`;

const handleSaveReplacement = `    setLastSavedBook({
      title: newTitle,
      author: newAuthor,
      isbn: newIsbn || 'N/A',
      location: newLocation || 'Unassigned',
      total: newTotal,
      category: newCategory || 'Uncategorized'
    });`;
content = content.replace(handleSaveTarget, handleSaveReplacement);

// 2. Remove dummy sub-texts in the success modal
const modalJsxTarget = `                  <View style={styles.successBookTopText}>
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
                </View>`;

const modalJsxReplacement = `                  <View style={styles.successBookTopText}>
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
                </View>`;

content = content.replace(modalJsxTarget, modalJsxReplacement);

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dummy data scrubbed from ManageInventoryScreen.js');
