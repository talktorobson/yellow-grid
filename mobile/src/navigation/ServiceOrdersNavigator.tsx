import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ServiceOrdersStackParamList } from './types';
import ServiceOrdersListScreen from '@screens/service-orders/ServiceOrdersListScreen';
import ServiceOrderDetailScreen from '@screens/service-orders/ServiceOrderDetailScreen';

const Stack = createNativeStackNavigator<ServiceOrdersStackParamList>();

export const ServiceOrdersNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ServiceOrdersList"
        component={ServiceOrdersListScreen}
        options={{ title: 'Service Orders' }}
      />
      <Stack.Screen
        name="ServiceOrderDetail"
        component={ServiceOrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
    </Stack.Navigator>
  );
};
