const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'chami', 'OneDrive', 'Desktop', 'LibroSeat', 'src', 'screens', 'admin', 'ManageReservationsScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add import
const importTarget = `import { colors, spacing, radius, typography } from '../../theme/theme';`;
const importReplacement = `import { colors, spacing, radius, typography } from '../../theme/theme';
import { getRichReservations, releaseReservation } from '../../services/reservationService';
import { ActivityIndicator, Alert } from 'react-native';`;
content = content.replace(importTarget, importReplacement);

// 2. Remove DUMMY_RESERVATIONS and add state & effect
const dummyTarget = `  const DUMMY_RESERVATIONS = [
    {
      id: '1',
      type: 'seat',
      patronName: 'Marcus Chen',
      patronInitials: 'MC',
      patronId: 'STU-9043',
      patronRole: 'Postgraduate • Robotics Eng.',
      status: 'Unattended',
      avatarBg: '#FCE7F3',
      avatarText: '#9D174D',
      statusBg: '#FCE7F3',
      statusColor: '#E11D48',
      resourceName: 'Reading Carrel 12 (Quiet Zone)',
      resourceDetail: '09:00 AM - 12:00 PM (35m idle)',
      resourceDetailColor: '#E11D48',
      rightBoxText: 'Level 2\\nStacks',
    },
    {
      id: '2',
      type: 'book',
      patronName: 'Sophia Patel',
      patronInitials: 'SP',
      patronId: 'FAC-4102',
      patronRole: 'Faculty • Physics & Astronomy',
      status: 'Overdue',
      avatarBg: '#FEF3C7',
      avatarText: '#92400E',
      statusBg: '#FEF3C7',
      statusColor: '#D97706',
      resourceName: 'Principles of Quantum Mechanics',
      resourceDetail: 'Due Yesterday, 17:00 PM',
      resourceDetailColor: '#D97706',
      rightBoxText: 'Call: QC174.12',
    }
  ];`;

const dummyReplacement = `  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await getRichReservations();
      setReservations(data);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }

  async function handleRelease(res) {
    try {
      setLoading(true);
      await releaseReservation(res.id, res.type, res.ref_id);
      await fetchData();
    } catch (e) {
      Alert.alert("Error", "Failed to release reservation");
      setLoading(false);
    }
  }`;
content = content.replace(dummyTarget, dummyReplacement);

// 3. Update filters based on dynamic data
const filtersTarget = `  const filters = [
    { id: 'All', label: 'All (18)' },
    { id: 'Seats', label: 'Seats (11)' },
    { id: 'Books', label: 'Books (7)' },
    { id: 'Alerts', label: 'Alerts (4)', hasDot: true },
  ];`;

const filtersReplacement = `  const seatCount = reservations.filter(r => r.type === 'seat').length;
  const bookCount = reservations.filter(r => r.type === 'book').length;
  const alertCount = reservations.filter(r => r.status === 'overdue' || r.status === 'unattended').length;

  const filters = [
    { id: 'All', label: \`All (\${reservations.length})\` },
    { id: 'Seats', label: \`Seats (\${seatCount})\` },
    { id: 'Books', label: \`Books (\${bookCount})\` },
    { id: 'Alerts', label: \`Alerts (\${alertCount})\`, hasDot: true },
  ];

  // Filtering logic
  const filteredData = reservations.filter(r => {
    // 1. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const patronName = r.profile?.full_name || 'unknown';
      const patronId = r.profile?.student_id || '';
      const resourceName = r.item?.title || r.item?.seat_number || '';
      if (!patronName.toLowerCase().includes(q) && !patronId.toLowerCase().includes(q) && !resourceName.toLowerCase().includes(q)) return false;
    }
    // 2. Tabs
    if (activeFilter === 'Seats' && r.type !== 'seat') return false;
    if (activeFilter === 'Books' && r.type !== 'book') return false;
    if (activeFilter === 'Alerts' && r.status !== 'overdue' && r.status !== 'unattended') return false;
    return true;
  });`;
content = content.replace(filtersTarget, filtersReplacement);

// 4. Update renderItem mapping
const renderItemTarget = `  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patronInfo}>
            <View style={[styles.avatar, { backgroundColor: item.avatarBg }]}>
              <Text style={[styles.avatarText, { color: item.avatarText }]}>{item.patronInitials}</Text>
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.patronName}>{item.patronName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.patronId}</Text>
                </View>
              </View>
              <Text style={styles.patronRole}>{item.patronRole}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: item.statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
            <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.resourceBox}>
          <View style={styles.resourceBoxLeft}>
            <View style={styles.resourceRow}>
              {item.type === 'seat' ? (
                <MaterialCommunityIcons name="sofa-single" size={18} color="#008080" style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="book-open-blank-variant" size={18} color="#008080" style={styles.resourceIcon} />
              )}
              <Text style={styles.resourceName} numberOfLines={1}>{item.resourceName}</Text>
            </View>
            <View style={styles.resourceRow}>
              {item.type === 'seat' ? (
                <MaterialCommunityIcons name="clock-outline" size={16} color={item.resourceDetailColor} style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color={item.resourceDetailColor} style={styles.resourceIcon} />
              )}
              <Text style={[styles.resourceDetail, { color: item.resourceDetailColor }]}>{item.resourceDetail}</Text>
            </View>
          </View>
          <View style={styles.resourceBoxRight}>
            <Text style={styles.rightBoxText}>{item.rightBoxText}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {item.type === 'seat' ? (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Ionicons name="notifications-outline" size={16} color="#4B5563" style={styles.btnIcon} />
                <Text style={styles.btnSecondaryText}>Notify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDanger}>
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={styles.btnIcon} />
                <Text style={styles.btnDangerText}>Release Seat</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Extend Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimaryLight}>
                <Ionicons name="send-outline" size={16} color="#B45309" style={styles.btnIcon} />
                <Text style={styles.btnPrimaryLightText}>Send Alert</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };`;

const renderItemReplacement = `  const renderItem = ({ item }) => {
    // Dynamic mappings based on database structure
    const patronName = item.profile?.full_name || 'Unknown Student';
    const patronInitials = patronName.substring(0, 2).toUpperCase();
    const patronId = item.profile?.student_id || item.user_id?.substring(0,6).toUpperCase();
    const patronRole = item.profile?.role === 'staff' ? 'Staff Member' : 'Student';
    
    let statusLabel = item.status === 'pending' ? 'Active' : item.status.charAt(0).toUpperCase() + item.status.slice(1);
    let avatarBg = '#E5E7EB';
    let avatarText = '#374151';
    let statusBg = '#E5E7EB';
    let statusColor = '#374151';
    
    if (item.status === 'pending' || item.status === 'active') {
      avatarBg = '#D1FAE5'; avatarText = '#065F46';
      statusBg = '#D1FAE5'; statusColor = '#059669';
    } else if (item.status === 'unattended') {
      avatarBg = '#FCE7F3'; avatarText = '#9D174D';
      statusBg = '#FCE7F3'; statusColor = '#E11D48';
      statusLabel = 'Unattended';
    } else if (item.status === 'overdue') {
      avatarBg = '#FEF3C7'; avatarText = '#92400E';
      statusBg = '#FEF3C7'; statusColor = '#D97706';
      statusLabel = 'Overdue';
    } else if (item.status === 'cancelled') {
      avatarBg = '#F3F4F6'; avatarText = '#9CA3AF';
      statusBg = '#F3F4F6'; statusColor = '#9CA3AF';
    }

    const resourceName = item.type === 'seat' ? \`Carrel \${item.item?.seat_number || '?'}\` : (item.item?.title || 'Unknown Book');
    let resourceDetail = item.type === 'seat' ? \`Reserved on \${new Date(item.created_at).toLocaleDateString()}\` : (item.due_date ? \`Due \${new Date(item.due_date).toLocaleString()}\` : 'No Due Date');
    const resourceDetailColor = statusColor;
    const rightBoxText = item.type === 'seat' ? (item.item?.room || 'General') : (item.item?.category || 'General Collection');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.patronInfo}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={[styles.avatarText, { color: avatarText }]}>{patronInitials}</Text>
            </View>
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.patronName}>{patronName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{patronId}</Text>
                </View>
              </View>
              <Text style={styles.patronRole}>{patronRole}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.resourceBox}>
          <View style={styles.resourceBoxLeft}>
            <View style={styles.resourceRow}>
              {item.type === 'seat' ? (
                <MaterialCommunityIcons name="sofa-single" size={18} color="#008080" style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="book-open-blank-variant" size={18} color="#008080" style={styles.resourceIcon} />
              )}
              <Text style={styles.resourceName} numberOfLines={1}>{resourceName}</Text>
            </View>
            <View style={styles.resourceRow}>
              {item.type === 'seat' ? (
                <MaterialCommunityIcons name="clock-outline" size={16} color={resourceDetailColor} style={styles.resourceIcon} />
              ) : (
                <MaterialCommunityIcons name="calendar-month-outline" size={16} color={resourceDetailColor} style={styles.resourceIcon} />
              )}
              <Text style={[styles.resourceDetail, { color: resourceDetailColor }]}>{resourceDetail}</Text>
            </View>
          </View>
          <View style={styles.resourceBoxRight}>
            <Text style={styles.rightBoxText} numberOfLines={2}>{rightBoxText}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {item.type === 'seat' ? (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Ionicons name="notifications-outline" size={16} color="#4B5563" style={styles.btnIcon} />
                <Text style={styles.btnSecondaryText}>Notify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnDanger, item.status === 'cancelled' && {opacity: 0.5}]} onPress={() => handleRelease(item)} disabled={item.status === 'cancelled'}>
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={styles.btnIcon} />
                <Text style={styles.btnDangerText}>Release Seat</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.btnSecondary}>
                <Text style={styles.btnSecondaryText}>Extend Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimaryLight, item.status === 'cancelled' && {opacity: 0.5}]} onPress={() => handleRelease(item)} disabled={item.status === 'cancelled'}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#1E3A8A" style={styles.btnIcon} />
                <Text style={styles.btnPrimaryLightText}>Complete / Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };`;
content = content.replace(renderItemTarget, renderItemReplacement);

// 5. Update FlatList data source and Add subtitle updates
const listTarget = `<FlatList
        data={DUMMY_RESERVATIONS}
        keyExtractor={item => item.id}`;
const listReplacement = `
      {loading && reservations.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id.toString()}`;

content = content.replace(listTarget, listReplacement);

// 6. Close the conditional render for loading indicator (and subtitle fixes)
const endListTarget = `/>
    </SafeAreaView>`;
const endListReplacement = `/>
      )}
    </SafeAreaView>`;
content = content.replace(endListTarget, endListReplacement);

const subtitleTarget = `<Text style={styles.itemCountText}>18 Active Holds • 4 Overdue</Text>`;
const subtitleReplacement = `<Text style={styles.itemCountText}>{reservations.filter(r=>r.status === 'pending').length} Active Holds • {reservations.filter(r=>r.status === 'overdue').length} Overdue</Text>`;
content = content.replace(subtitleTarget, subtitleReplacement);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched ManageReservationsScreen.js');
