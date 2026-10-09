import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/theme';

import MainTabs from './MainTabs';
import AdminTabs from './AdminTabs';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import StaffLoginScreen from '../screens/auth/StaffLoginScreen';

import BookDetailsScreen from '../screens/book/BookDetailsScreen';
import ReserveBookScreen from '../screens/book/ReserveBookScreen';
import BookConfirmationScreen from '../screens/book/BookConfirmationScreen';

import SeatAvailabilityScreen from '../screens/seat/SeatAvailabilityScreen';
import SelectSeatScreen from '../screens/seat/SelectSeatScreen';
import SeatConfirmationScreen from '../screens/seat/SeatConfirmationScreen';

import NotificationDetailScreen from '../screens/home_account/NotificationDetailScreen';
import MyReservationsScreen from '../screens/home_account/MyReservationsScreen';
import ReservationDetailScreen from '../screens/home_account/ReservationDetailScreen';
import PersonalInfoScreen from '../screens/home_account/PersonalInfoScreen';
import SettingsScreen from '../screens/home_account/SettingsScreen';

import SeatAllocationScreen from '../screens/admin/SeatAllocationScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.white },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600', fontSize: 16 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      {/* Welcome is always first on a cold start; every later screen is
          reached via replace()/reset(), so back never returns to it. */}
      <Stack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Reset Password' }} />
        <Stack.Screen name="StaffLogin" component={StaffLoginScreen} options={{ headerShown: false }} />

        {/* Route names "Home" and "AdminDashboard" are kept so Login /
            SignUp / Welcome / ResetPassword need no changes. */}
        <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="AdminDashboard" component={AdminTabs} options={{ headerShown: false }} />

        {/* Full-screen detail pages (no bottom tab bar) */}
        <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} options={{ title: 'Notification' }} />
        <Stack.Screen name="MyReservations" component={MyReservationsScreen} options={{ title: 'Reservation History' }} />
        <Stack.Screen name="ReservationDetail" component={ReservationDetailScreen} options={{ title: 'Reservation Detail' }} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ title: 'Personal Information' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />

        <Stack.Screen name="BookDetails" component={BookDetailsScreen} options={{ title: 'Book Details' }} />
        <Stack.Screen name="ReserveBook" component={ReserveBookScreen} options={{ title: 'Reserve Book' }} />
        <Stack.Screen name="BookConfirmation" component={BookConfirmationScreen} options={{ title: 'Confirmation', headerBackVisible: false }} />

        <Stack.Screen name="SeatAvailability" component={SeatAvailabilityScreen} options={{ title: 'Book a Seat' }} />
        <Stack.Screen name="SelectSeat" component={SelectSeatScreen} options={{ title: 'Select Seat' }} />
        <Stack.Screen name="SeatConfirmation" component={SeatConfirmationScreen} options={{ title: 'Confirmation', headerBackVisible: false }} />

        <Stack.Screen name="SeatAllocation" component={SeatAllocationScreen} options={{ title: 'Seat Allocation' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}