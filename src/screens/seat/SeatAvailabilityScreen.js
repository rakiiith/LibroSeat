import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabase/supabaseClient';

const C = { bg: '#F4F7F8', white: '#FFFFFF', teal: '#0F8B8D', dark: '#08696C', text: '#18323B', muted: '#71838A', border: '#DFE8EA', pale: '#E3F5F1' };

export default function SeatAvailabilityScreen({ navigation }) {
  const [seats, setSeats] = useState([]);
  const [floor, setFloor] = useState('All');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reservedIds, setReservedIds] = useState([]);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data, error: issue } = await supabase.from('library_seats')
        .select('id, seat_number, seat_type, is_active, reading_rooms(name, floor)')
        .eq('is_active', true).order('seat_number');
      if (issue) throw issue;
      setSeats(data || []);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const { data: bookings } = await supabase.from('seat_reservations').select('seat_id').eq('booking_date', today).eq('status', 'confirmed');
      setReservedIds((bookings || []).map(item => String(item.seat_id)));
    } catch (e) { setError(e.message || 'Unable to load seat availability.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const floors = useMemo(() => ['All', ...new Set(seats.map(s => s.reading_rooms?.floor).filter(v => v != null).map(String))], [seats]);
  const filtered = useMemo(() => seats.filter(s => (floor === 'All' || String(s.reading_rooms?.floor) === floor) && `${s.seat_number} ${s.reading_rooms?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [seats, floor, query]);

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
    <FlatList data={filtered} keyExtractor={s => String(s.id)} contentContainerStyle={styles.list} refreshing={refreshing} onRefresh={() => load(true)}
      ListHeaderComponent={<>
        <Text style={styles.eyebrow}>LIBROSEAT / SEATING</Text><Text style={styles.title}>Seat availability</Text>
        <Text style={styles.subtitle}>Find an available place to study.</Text>
        <View style={styles.search}><Ionicons name="search-outline" size={19} color={C.muted}/><TextInput value={query} onChangeText={setQuery} placeholder="Search room or seat number" placeholderTextColor="#91A0A8" style={styles.searchInput}/>{query ? <Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={19} color={C.muted}/></Pressable> : null}</View>
        <Text style={styles.section}>Filter by floor</Text>
        <FlatList horizontal data={floors} keyExtractor={v => v} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} renderItem={({item}) => <Pressable onPress={() => setFloor(item)} style={[styles.chip, floor === item && styles.chipOn]}><Text style={[styles.chipText, floor === item && styles.chipTextOn]}>{item === 'All' ? 'All floors' : `Floor ${item}`}</Text></Pressable>}/>
        <View style={styles.row}><Text style={styles.section}>Seats today</Text><Text style={styles.count}>{filtered.filter(s => !reservedIds.includes(String(s.id))).length} available</Text></View>
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => load()}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
      </>}
      renderItem={({item}) => <Pressable style={styles.card} onPress={() => navigation.navigate('SelectSeat', { room: item.reading_rooms?.name, floor: item.reading_rooms?.floor, selectedSeatId: item.id })}>
        <View style={styles.seatIcon}><Ionicons name="grid-outline" size={20} color={C.teal}/></View><View style={{flex:1}}><Text style={styles.seatName}>Seat {item.seat_number}</Text><Text style={styles.meta}>{item.reading_rooms?.name || 'Reading room'}{item.reading_rooms?.floor != null ? ` · Floor ${item.reading_rooms.floor}` : ''}</Text></View><View style={[styles.available, reservedIds.includes(String(item.id)) && styles.booked]}><View style={[styles.dot, reservedIds.includes(String(item.id)) && styles.bookedDot]}/><Text style={[styles.availableText, reservedIds.includes(String(item.id)) && styles.bookedText]}>{reservedIds.includes(String(item.id)) ? 'Booked' : 'Available'}</Text></View><Ionicons name="chevron-forward" size={18} color={C.muted}/>
      </Pressable>}
      ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator color={C.teal}/><Text style={styles.meta}>Loading seats…</Text></View> : !error ? <Text style={styles.empty}>No seats match your search.</Text> : null}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:C.bg}, list:{padding:20,paddingBottom:30,flexGrow:1}, eyebrow:{color:C.teal,fontSize:10,fontWeight:'900',letterSpacing:1.8,marginTop:8}, title:{color:C.text,fontSize:28,fontWeight:'900',marginTop:12}, subtitle:{color:C.muted,fontSize:13,marginTop:6}, search:{marginTop:20,backgroundColor:C.white,borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:9}, searchInput:{flex:1,paddingVertical:14,color:C.text,fontSize:13}, section:{color:C.text,fontSize:15,fontWeight:'800'}, chips:{gap:8,paddingVertical:12}, chip:{paddingVertical:10,paddingHorizontal:15,borderRadius:12,borderWidth:1,borderColor:C.border,backgroundColor:C.white}, chipOn:{backgroundColor:C.teal,borderColor:C.teal},chipText:{fontSize:12,fontWeight:'700',color:C.muted},chipTextOn:{color:C.white},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8,marginBottom:12},count:{color:C.dark,fontSize:11,fontWeight:'700'},card:{backgroundColor:C.white,borderRadius:16,borderWidth:1,borderColor:C.border,padding:13,marginBottom:10,flexDirection:'row',alignItems:'center',gap:11},seatIcon:{width:42,height:42,borderRadius:13,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},seatName:{fontSize:15,fontWeight:'800',color:C.text},meta:{fontSize:11,color:C.muted,marginTop:4},available:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#E5F6EC',borderRadius:10,paddingHorizontal:8,paddingVertical:6},booked:{backgroundColor:'#FDEBEC'},availableText:{fontSize:9,fontWeight:'800',color:'#23865B'},bookedText:{color:'#B94048'},dot:{width:6,height:6,borderRadius:3,backgroundColor:'#23865B'},bookedDot:{backgroundColor:'#B94048'},error:{backgroundColor:'#FDECEC',padding:14,borderRadius:12,marginBottom:12},errorText:{color:'#A52B32'},retry:{color:'#A52B32',fontWeight:'800',marginTop:8},center:{padding:30,alignItems:'center',gap:10},empty:{textAlign:'center',color:C.muted,padding:30} });
