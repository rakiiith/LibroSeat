const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'chami', 'OneDrive', 'Desktop', 'LibroSeat', 'src', 'screens', 'admin', 'SeatAllocationScreen.js');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

// 1. Add import
const importTarget = `import { supabase } from '../../supabase/supabaseClient';`;
const importReplacement = `import { supabase } from '../../supabase/supabaseClient';
import { getRichReservations, releaseReservation } from '../../services/reservationService';`;
content = content.replace(importTarget, importReplacement);

// 2. Add activeReservations state
const stateTarget = `  const [autoReleaseEnabled, setAutoReleaseEnabled] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);`;
const stateReplacement = `  const [autoReleaseEnabled, setAutoReleaseEnabled] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [activeReservations, setActiveReservations] = useState({});`;
content = content.replace(stateTarget, stateReplacement);

// 3. Update fetchSeats to get reservations
const fetchTarget = `  async function fetchSeats() {
    setLoading(true);
    const { data, error } = await supabase.from('seats').select('*').order('seat_number');
    if (data && !error) {
      setSeats(data);
    }
    setLoading(false);
  }`;
const fetchReplacement = `  async function fetchSeats() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('seats').select('*').order('seat_number');
      if (data && !error) {
        setSeats(data);
      }
      
      const allRes = await getRichReservations();
      const activeSeatRes = allRes.filter(r => r.type === 'seat' && (r.status === 'pending' || r.status === 'active' || r.status === 'unattended'));
      
      const resMap = {};
      activeSeatRes.forEach(r => {
        resMap[r.ref_id] = r;
      });
      setActiveReservations(resMap);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }`;
content = content.replace(fetchTarget, fetchReplacement);

// 4. Update counts
const countTarget = `  const freeCount = seats.filter(s => s.is_available).length;
  const occupiedCount = seats.filter(s => !s.is_available).length;`;
const countReplacement = `  const freeCount = seats.filter(s => s.is_available).length;
  
  let occupiedCount = 0;
  let reservedCount = 0;
  let unattendedCount = 0;

  seats.forEach(s => {
    if (!s.is_available) {
      const res = activeReservations[s.id];
      if (res) {
        if (res.status === 'unattended') unattendedCount++;
        else if (res.status === 'pending') reservedCount++;
        else occupiedCount++;
      } else {
        occupiedCount++;
      }
    }
  });`;
content = content.replace(countTarget, countReplacement);

// 5. Update stats row unattended/reserved counts
const statsTarget = `          <View style={[styles.statBox, { borderTopColor: '#F59E0B' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="time-outline" size={12} color="#F59E0B" />
              <Text style={[styles.statBoxTitle, { color: '#F59E0B' }]}>IDLE</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#F59E0B' }]}>0</Text>
          </View>`;
const statsReplacement = `          <View style={[styles.statBox, { borderTopColor: '#E11D48' }]}>
            <View style={styles.statBoxHeader}>
              <Ionicons name="time-outline" size={12} color="#E11D48" />
              <Text style={[styles.statBoxTitle, { color: '#E11D48' }]}>IDLE / UNATTENDED</Text>
            </View>
            <Text style={[styles.statBoxNumber, { color: '#E11D48' }]}>{unattendedCount}</Text>
          </View>`;
content = content.replace(statsTarget, statsReplacement);

const legendTarget = `          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
            <Text style={[styles.legendText, { color: '#E11D48' }]}>Unattended (0)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} />
            <Text style={[styles.legendText, { color: '#06B6D4' }]}>Reserved (0)</Text>
          </View>`;
const legendReplacement = `          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
            <Text style={[styles.legendText, { color: '#E11D48' }]}>Unattended ({unattendedCount})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} />
            <Text style={[styles.legendText, { color: '#06B6D4' }]}>Reserved ({reservedCount})</Text>
          </View>`;
content = content.replace(legendTarget, legendReplacement);

// 6. Grid rendering logic
const gridTarget = `              let seatStyle = styles.seatFree;
              let seatTextStyle = styles.seatFreeText;
              let icon = <Ionicons name="ellipse-outline" size={14} color="#009688" />;
              
              if (!seat.is_available) {
                seatStyle = styles.seatOccupied;
                seatTextStyle = styles.seatOccupiedText;
                icon = <Ionicons name="person" size={12} color={colors.white} />;
              }`;
const gridReplacement = `              let seatStyle = styles.seatFree;
              let seatTextStyle = styles.seatFreeText;
              let icon = <Ionicons name="ellipse-outline" size={14} color="#009688" />;
              
              if (!seat.is_available) {
                const res = activeReservations[seat.id];
                if (res?.status === 'unattended') {
                   seatStyle = { backgroundColor: '#FCE7F3', borderWidth: 1, borderColor: '#E11D48' };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#E11D48', marginBottom: 4 };
                   icon = <Ionicons name="time-outline" size={12} color="#E11D48" />;
                } else if (res?.status === 'pending') {
                   seatStyle = { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#0284C7' };
                   seatTextStyle = { fontSize: 12, fontWeight: '700', color: '#0284C7', marginBottom: 4 };
                   icon = <Ionicons name="bookmark" size={12} color="#0284C7" />;
                } else {
                   seatStyle = styles.seatOccupied;
                   seatTextStyle = styles.seatOccupiedText;
                   icon = <Ionicons name="person" size={12} color={colors.white} />;
                }
              }`;
content = content.replace(gridTarget, gridReplacement);

// 7. Detail card rendering logic
const detailTarget = `                <Text style={styles.detailPatronName}>
                  {selectedSeat.is_available ? 'No Patron Assigned' : 'Patron: M. Chen (STU-9843)'}
                </Text>
              </View>
              
              <View style={[styles.detailStatusBox, { backgroundColor: selectedSeat.is_available ? '#EFFFFE' : '#FCE7F3' }]}>
                <View style={[styles.detailStatusDot, { backgroundColor: selectedSeat.is_available ? '#009688' : '#E11D48' }]} />
                <Text style={[styles.detailStatusText, { color: selectedSeat.is_available ? '#009688' : '#E11D48' }]}>
                  {selectedSeat.is_available ? 'Free' : 'Occupied'}
                </Text>
              </View>
            </View>

            <View style={styles.detailTimeRow}>
              <View style={styles.detailTimeBoxLeft}>
                <Text style={styles.detailTimeLabel}>SESSION STARTED</Text>
                <Text style={styles.detailTimeValue}>
                  {selectedSeat.is_available ? '--' : '13:42 (1h 18m)'}
                </Text>
              </View>
              <View style={styles.detailTimeBoxRight}>
                <Text style={styles.detailAutoLabel}>AUTO-RELEASE CLOCK</Text>
                <Text style={styles.detailAutoValue}>
                  {selectedSeat.is_available ? '--' : 'T - 04m\\nremaining'}
                </Text>
              </View>
            </View>

            <View style={styles.detailActionRow}>
              <TouchableOpacity style={styles.detailBtnSecondary}>
                <Ionicons name="notifications-outline" size={16} color="#009688" style={{marginRight: 6}} />
                <Text style={styles.detailBtnSecondaryText}>Ping Patron</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailBtnPrimary}>
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={{marginRight: 6}} />
                <Text style={styles.detailBtnPrimaryText}>Release Carrel</Text>
              </TouchableOpacity>
            </View>`;

const detailReplacement = `                <Text style={styles.detailPatronName}>
                  {selectedSeat.is_available 
                    ? 'No Patron Assigned' 
                    : activeReservations[selectedSeat.id] 
                      ? \`Patron: \${activeReservations[selectedSeat.id].profile?.full_name} (\${activeReservations[selectedSeat.id].profile?.student_id || 'N/A'})\`
                      : 'Occupied by unknown'}
                </Text>
              </View>
              
              <View style={[styles.detailStatusBox, { backgroundColor: selectedSeat.is_available ? '#EFFFFE' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#FCE7F3' : '#F3F4F6') }]}>
                <View style={[styles.detailStatusDot, { backgroundColor: selectedSeat.is_available ? '#009688' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#E11D48' : '#374151') }]} />
                <Text style={[styles.detailStatusText, { color: selectedSeat.is_available ? '#009688' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? '#E11D48' : '#374151') }]}>
                  {selectedSeat.is_available ? 'Free' : (activeReservations[selectedSeat.id]?.status === 'unattended' ? 'Unattended' : (activeReservations[selectedSeat.id]?.status === 'pending' ? 'Reserved' : 'Occupied'))}
                </Text>
              </View>
            </View>

            <View style={styles.detailTimeRow}>
              <View style={styles.detailTimeBoxLeft}>
                <Text style={styles.detailTimeLabel}>BOOKED AT</Text>
                <Text style={styles.detailTimeValue}>
                  {selectedSeat.is_available ? '--' : (activeReservations[selectedSeat.id] ? new Date(activeReservations[selectedSeat.id].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown')}
                </Text>
              </View>
              <View style={styles.detailTimeBoxRight}>
                <Text style={styles.detailAutoLabel}>AUTO-RELEASE CLOCK</Text>
                <Text style={styles.detailAutoValue}>
                  {selectedSeat.is_available ? '--' : (activeReservations[selectedSeat.id]?.status === 'pending' ? 'T - 15m\\ngrace period' : '--')}
                </Text>
              </View>
            </View>

            <View style={styles.detailActionRow}>
              <TouchableOpacity style={styles.detailBtnSecondary} disabled={selectedSeat.is_available}>
                <Ionicons name="notifications-outline" size={16} color={selectedSeat.is_available ? "#9CA3AF" : "#009688"} style={{marginRight: 6}} />
                <Text style={[styles.detailBtnSecondaryText, selectedSeat.is_available && {color: "#9CA3AF"}]}>Ping Patron</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.detailBtnPrimary, selectedSeat.is_available && {backgroundColor: "#F87171"}]}
                disabled={selectedSeat.is_available}
                onPress={async () => {
                  if (activeReservations[selectedSeat.id]) {
                    setLoading(true);
                    await releaseReservation(activeReservations[selectedSeat.id].id, 'seat', selectedSeat.id);
                    await fetchSeats();
                    setSelectedSeat(null);
                  }
                }}
              >
                <Ionicons name="log-out-outline" size={16} color={colors.white} style={{marginRight: 6}} />
                <Text style={styles.detailBtnPrimaryText}>Release Carrel</Text>
              </TouchableOpacity>
            </View>`;

content = content.replace(detailTarget, detailReplacement);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched SeatAllocationScreen.js');
