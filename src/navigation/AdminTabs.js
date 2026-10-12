// Staff/Admin bottom tabs: Dashboard, Inventory, Reservations, Seats

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageInventoryScreen from '../screens/admin/ManageInventoryScreen';
import ManageReservationsScreen from '../screens/admin/ManageReservationsScreen';
import SeatAllocationScreen from '../screens/admin/SeatAllocationScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  AdminHome: ['view-dashboard', 'view-dashboard-outline'],
  Inventory: ['archive', 'archive-outline'],
  Reservations: ['calendar-check', 'calendar-check-outline'],
  Seats: ['sofa-single', 'sofa-single-outline'],
};

const LABELS = {
  AdminHome: 'Dashboard',
  Inventory: 'Inventory',
  Reservations: 'Reservations',
  Seats: 'Seats',
};

export default function AdminTabs() {
  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: LABELS[route.name],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 8 },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name];
          return <MaterialCommunityIcons name={focused ? active : inactive} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AdminHome" component={AdminDashboardScreen} />
      <Tab.Screen name="Inventory" component={ManageInventoryScreen} />
      <Tab.Screen name="Reservations" component={ManageReservationsScreen} />
      <Tab.Screen name="Seats" component={SeatAllocationScreen} />
    </Tab.Navigator>
  );
}