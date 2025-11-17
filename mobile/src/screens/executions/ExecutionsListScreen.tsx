import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ExecutionsListScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={64} color="#CCCCCC" />
        <Text style={styles.title}>Executions</Text>
        <Text style={styles.subtitle}>
          View and manage your field service executions here
        </Text>
        <Text style={styles.comingSoon}>Coming soon...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  comingSoon: {
    fontSize: 14,
    color: '#999999',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default ExecutionsListScreen;
