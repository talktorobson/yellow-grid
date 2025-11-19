import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const LoginScreen = () => {
  const [email, setEmail] = useState('tech@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login failed', err);
      setError(err.message || 'Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yellow Grid</Text>
      <Text style={styles.subtitle}>Technician Login</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  error: {
    color: 'red',
    marginBottom: 15,
  },
});
