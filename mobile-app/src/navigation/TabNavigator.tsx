import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { JobsListScreen } from '../screens/JobsListScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>{name}</Text>
  </View>
);

export const TabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Jobs" component={JobsListScreen} />
      <Tab.Screen name="Schedule">
        {() => <PlaceholderScreen name="Schedule" />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <PlaceholderScreen name="Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};
