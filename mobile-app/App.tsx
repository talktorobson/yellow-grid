import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './src/db';

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </DatabaseProvider>
  );
}
