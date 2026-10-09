// Staff/Admin bottom tabs: Home, Books, Manage, Profile (matches Figma "24").

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageInventoryScreen from '../screens/admin/ManageInventoryScreen';
import ManageReservationsScreen from '../screens/admin/ManageReservationsScreen';
import StaffProfileScreen from '../screens/admin/StaffProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  AdminHome: ['home', 'home-outline'],
  Books: ['book', 'book-outline'],
  Manage: ['list', 'list-outline'],
  StaffProfile: ['person', 'person-outline'],
};

const LABELS = {
  AdminHome: 'Home',
  Books: 'Books',
  Manage: 'Manage',
  StaffProfile: 'Profile',
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = ICONS[route.name];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AdminHome" component={AdminDashboardScreen} />
      <Tab.Screen name="Books" component={ManageInventoryScreen} />
      <Tab.Screen name="Manage" component={ManageReservationsScreen} />
      <Tab.Screen name="StaffProfile" component={StaffProfileScreen} />
    </Tab.Navigator>
  );
}