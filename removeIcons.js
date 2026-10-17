const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'chami', 'OneDrive', 'Desktop', 'LibroSeat', 'src', 'screens', 'admin', 'ManageInventoryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n
content = content.replace(/\r\n/g, '\n');

// 1. Remove Header Barcode Icon
const headerTarget = `        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="cube" size={20} color={colors.primary} />
            </View>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
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
        </View>`;
        
const headerReplacement = `        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="cube" size={20} color={colors.primary} />
            </View>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.dashboardTitle}>Inventory</Text>
                <View style={styles.titleDot} />
              </View>
              <Text style={styles.staffPortalText}>Main Wing • Staff Node</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person" size={14} color={colors.white} />
            </View>
          </View>
        </View>`;
content = content.replace(headerTarget, headerReplacement);

// 2. Remove Search Barcode Icon
const searchTarget = `          <View style={styles.searchRow}>
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
          </View>`;
          
const searchReplacement = `          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.textMuted} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Search books, ISBN, author..." 
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>`;
content = content.replace(searchTarget, searchReplacement);


// 3. Remove Card Footer QR Icon
const footerTarget = `        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {item.category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.footerIcons}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>`;

const footerReplacement = `        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {item.category || 'Uncategorized'}
            </Text>
          </View>
          <View style={styles.footerIcons}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>`;
content = content.replace(footerTarget, footerReplacement);

// Convert back to CRLF
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Icons removed successfully!');
