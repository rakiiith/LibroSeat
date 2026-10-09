// Student bottom tabs: Home, Search, Notifications, Profile.
// The first tab is named "HomeTab" (label "Home") so it doesn't clash with
// the parent stack route "Home" that Login/SignUp/Welcome navigate to.
// These are real tabs — tapping an icon switches page, and the tab bar
// stays visible on these four root screens. Detail screens (BookDetails,
// NotificationDetail, ReservationDetail, ...) live in the parent stack, so
// they open full-screen without the tab bar, matching the Figma designs.

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

import HomeDashboardScreen from '../screens/home_account/HomeDashboardScreen';
import SearchBooksScreen from '../screens/book/SearchBooksScreen';
import NotificationsScreen from '../screens/home_account/NotificationsScreen';
import ProfileScreen from '../screens/home_account/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  HomeTab: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Notifications: ['notifications', 'notifications-outline'],
  Profile: ['person', 'person-outline'],
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: route.name === 'HomeTab' ? 'Home' : route.name,
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
      <Tab.Screen name="HomeTab" component={HomeDashboardScreen} />
      <Tab.Screen name="Search" component={SearchBooksScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}