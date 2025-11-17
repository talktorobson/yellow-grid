import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ExecutionsStackParamList } from './types';
import ExecutionsListScreen from '@screens/executions/ExecutionsListScreen';
import CheckInScreen from '@screens/executions/CheckInScreen';
import CheckOutScreen from '@screens/executions/CheckOutScreen';
import MediaCaptureScreen from '@screens/executions/MediaCaptureScreen';

const Stack = createNativeStackNavigator<ExecutionsStackParamList>();

export const ExecutionsNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ExecutionsList"
        component={ExecutionsListScreen}
        options={{ title: 'Executions' }}
      />
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{ title: 'Check In' }}
      />
      <Stack.Screen
        name="CheckOut"
        component={CheckOutScreen}
        options={{ title: 'Check Out' }}
      />
      <Stack.Screen
        name="MediaCapture"
        component={MediaCaptureScreen}
        options={{
          title: 'Capture Photo',
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
};
