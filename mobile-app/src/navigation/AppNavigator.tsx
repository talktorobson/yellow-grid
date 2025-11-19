import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { TabNavigator } from './TabNavigator';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { NotificationService } from '../services/notifications/NotificationService';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      NotificationService.getInstance().registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="JobDetail" component={JobDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};
