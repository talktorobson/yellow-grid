/**
 * Yellow Grid Mobile - Main Navigator
 * Bottom tab navigation with Home, Orders, Agenda, Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import OrdersListScreen from '../screens/orders/OrdersListScreen';
import ServiceOrderDetailScreen from '../screens/orders/ServiceOrderDetailScreen';
import AgendaScreen from '../screens/agenda/AgendaScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import PersonalInfoScreen from '../screens/profile/PersonalInfoScreen';
import NotificationSettingsScreen from '../screens/profile/NotificationSettingsScreen';
import AvailabilitySettingsScreen from '../screens/profile/AvailabilitySettingsScreen';
import ServiceAreasScreen from '../screens/profile/ServiceAreasScreen';
import CertificationsScreen from '../screens/profile/CertificationsScreen';
import LanguageSettingsScreen from '../screens/profile/LanguageSettingsScreen';
import HelpFaqScreen from '../screens/profile/HelpFaqScreen';
import ContactSupportScreen from '../screens/profile/ContactSupportScreen';
import TermsPrivacyScreen from '../screens/profile/TermsPrivacyScreen';
import ChatScreen from '../screens/chat/ChatScreen';

// Types
export type OrdersStackParamList = {
  OrdersList: undefined;
  ServiceOrderDetail: { orderId: string };
  Chat: { orderId: string; orderNumber?: string };
  CheckIn: { orderId: string };
  CheckOut: { orderId: string };
  WCF: { orderId: string };
  Checklist: { orderId: string; checklistId: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ChangePassword: undefined;
  PersonalInfo: undefined;
  NotificationSettings: undefined;
  Availability: undefined;
  ServiceAreas: undefined;
  Certifications: undefined;
  LanguageSettings: undefined;
  HelpFaq: undefined;
  ContactSupport: undefined;
  TermsPrivacy: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Agenda: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Orders Stack Navigator
const OrdersNavigator = () => {
  return (
    <OrdersStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <OrdersStack.Screen name="OrdersList" component={OrdersListScreen} />
      <OrdersStack.Screen name="ServiceOrderDetail" component={ServiceOrderDetailScreen} />
      <OrdersStack.Screen name="Chat" component={ChatScreen} />
    </OrdersStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <ProfileStack.Screen name="Availability" component={AvailabilitySettingsScreen} />
      <ProfileStack.Screen name="ServiceAreas" component={ServiceAreasScreen} />
      <ProfileStack.Screen name="Certifications" component={CertificationsScreen} />
      <ProfileStack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <ProfileStack.Screen name="HelpFaq" component={HelpFaqScreen} />
      <ProfileStack.Screen name="ContactSupport" component={ContactSupportScreen} />
      <ProfileStack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
    </ProfileStack.Navigator>
  );
};

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Agenda') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray[100],
          paddingTop: 4,
          height: 88,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium as '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{ title: 'My Orders' }}
      />
      <Tab.Screen
        name="Agenda"
        component={AgendaScreen}
        options={{ title: 'Agenda' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
