import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

// Create a fresh QueryClient for each test
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

// Wrapper with all necessary providers
export const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>{children}</NavigationContainer>
    </QueryClientProvider>
  );
};

// Custom render function that includes providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';
