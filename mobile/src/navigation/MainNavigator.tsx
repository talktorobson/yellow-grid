import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { ServiceOrdersNavigator } from './ServiceOrdersNavigator';
import { ExecutionsNavigator } from './ExecutionsNavigator';
import ProfileScreen from '@screens/profile/ProfileScreen';
import ScheduleScreen from '@screens/schedule/ScheduleScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'ServiceOrders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Executions') {
            iconName = focused ? 'construct' : 'construct-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="ServiceOrders"
        component={ServiceOrdersNavigator}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Schedule' }}
      />
      <Tab.Screen
        name="Executions"
        component={ExecutionsNavigator}
        options={{ title: 'Executions' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
