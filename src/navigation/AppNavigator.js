// Wires every member's screens into one app via a native stack navigator.
// You generally should NOT need to edit this file — add new screens inside
// your own feature folder and register them here only if your module needs
// a screen beyond the Milestone 02 set (tell the group first, since this
// file is shared).

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';
import { subscribeToSession } from '../supabase/authService';

import LoginScreen from '../screens/auth/LoginScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

import SearchBooksScreen from '../screens/book/SearchBooksScreen';
import BookDetailsScreen from '../screens/book/BookDetailsScreen';
import ReserveBookScreen from '../screens/book/ReserveBookScreen';
import BookConfirmationScreen from '../screens/book/BookConfirmationScreen';

import SeatAvailabilityScreen from '../screens/seat/SeatAvailabilityScreen';
import SelectSeatScreen from '../screens/seat/SelectSeatScreen';
import SeatConfirmationScreen from '../screens/seat/SeatConfirmationScreen';

import HomeDashboardScreen from '../screens/home_account/HomeDashboardScreen';
import NotificationsScreen from '../screens/home_account/NotificationsScreen';
import NotificationDetailScreen from '../screens/home_account/NotificationDetailScreen';
import MyReservationsScreen from '../screens/seat/MyReservationsScreen';
import ReservationDetailScreen from '../screens/home_account/ReservationDetailScreen';
import PaymentDetailsScreen from '../screens/home_account/PaymentDetailsScreen';

import StaffLoginScreen from '../screens/admin/StaffLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageInventoryScreen from '../screens/admin/ManageInventoryScreen';
import ManageReservationsScreen from '../screens/admin/ManageReservationsScreen';
import SeatAllocationScreen from '../screens/admin/SeatAllocationScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '600' },
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToSession((user) => {
      if (!user) {
        setInitialRoute('Welcome');
        return;
      }
      setInitialRoute(user.role === 'staff' ? 'AdminDashboard' : 'Home');
    });
    return unsubscribe;
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={screenOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
        <Stack.Screen name="Home" component={HomeDashboardScreen} options={{ headerShown: false }} />

        {/* Book module — Shashith */}
        <Stack.Screen name="SearchBooks" component={SearchBooksScreen} options={{ title: 'Search Books' }} />
        <Stack.Screen name="BookDetails" component={BookDetailsScreen} options={{ title: 'Book Details' }} />
        <Stack.Screen name="ReserveBook" component={ReserveBookScreen} options={{ title: 'Reserve Book' }} />
        <Stack.Screen name="BookConfirmation" component={BookConfirmationScreen} options={{ title: 'Confirmation', headerBackVisible: false }} />

        {/* Seat module — Higgoda */}
        <Stack.Screen name="SeatAvailability" component={SeatAvailabilityScreen} options={{ title: 'Book a Seat' }} />
        <Stack.Screen name="SelectSeat" component={SelectSeatScreen} options={{ title: 'Select Seat' }} />
        <Stack.Screen name="SeatConfirmation" component={SeatConfirmationScreen} options={{ title: 'Confirmation', headerBackVisible: false }} />

        {/* Home & Account module — Nimnada */}
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
        <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} options={{ title: 'Notification' }} />
        <Stack.Screen name="MyReservations" component={MyReservationsScreen} options={{ title: 'My Reservations' }} />
        <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'Reservation Detail' }} />
        <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} options={{ title: 'Payment Details' }} />

        {/* Staff/Admin module — Bandara */}
        <Stack.Screen name="StaffLogin" component={StaffLoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageInventory" component={ManageInventoryScreen} options={{ title: 'Manage Inventory' }} />
        <Stack.Screen name="ManageReservations" component={ManageReservationsScreen} options={{ title: 'Manage Reservations' }} />
        <Stack.Screen name="SeatAllocation" component={SeatAllocationScreen} options={{ title: 'Seat Allocation' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
