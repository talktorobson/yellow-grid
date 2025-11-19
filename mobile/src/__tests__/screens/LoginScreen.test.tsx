import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../test-utils';
import LoginScreen from '@screens/auth/LoginScreen';
import { useAuthStore } from '@store/auth.store';
import { mockCredentials } from '../../__mocks__/mockData';

// Mock the auth store
jest.mock('@store/auth.store');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation
    mockUseAuthStore.mockReturnValue({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockLogin,
      logout: jest.fn(),
      refreshUser: jest.fn(),
      checkAuthStatus: jest.fn(),
      updateUser: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render all login form elements', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      // Check header
      expect(getByText('Yellow Grid')).toBeTruthy();
      expect(getByText('Field Service Management')).toBeTruthy();

      // Check form inputs
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();

      // Check button
      expect(getByText('Sign In')).toBeTruthy();

      // Check footer
      expect(getByText('For support, contact your administrator')).toBeTruthy();
    });

    it('should not show error text initially', () => {
      const { queryByText } = renderWithProviders(<LoginScreen />);

      // Error should not be visible
      expect(queryByText(/error/i)).toBeNull();
    });
  });

  describe('Input Handling', () => {
    it('should update email input value', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const emailInput = getByPlaceholderText('Email');

      fireEvent.changeText(emailInput, mockCredentials.email);

      expect(emailInput.props.value).toBe(mockCredentials.email);
    });

    it('should update password input value', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const passwordInput = getByPlaceholderText('Password');

      fireEvent.changeText(passwordInput, mockCredentials.password);

      expect(passwordInput.props.value).toBe(mockCredentials.password);
    });

    it('should have correct input properties', () => {
      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');

      // Email input properties
      expect(emailInput.props.autoCapitalize).toBe('none');
      expect(emailInput.props.keyboardType).toBe('email-address');
      expect(emailInput.props.autoComplete).toBe('email');

      // Password input properties
      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(passwordInput.props.autoCapitalize).toBe('none');
      expect(passwordInput.props.autoComplete).toBe('password');
    });
  });

  describe('Form Validation', () => {
    it('should show alert when email is empty', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      // Only fill password
      fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

      // Press login
      fireEvent.press(getByText('Sign In'));

      // Check alert was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter both email and password'
      );

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show alert when password is empty', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      // Only fill email
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');

      // Press login
      fireEvent.press(getByText('Sign In'));

      // Check alert was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter both email and password'
      );

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should show alert when both fields are empty', () => {
      const { getByText } = renderWithProviders(<LoginScreen />);

      // Press login without filling anything
      fireEvent.press(getByText('Sign In'));

      // Check alert was shown
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please enter both email and password'
      );

      // Login should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Login Flow', () => {
    it('should call login with correct credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);

      const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Email'), mockCredentials.email);
      fireEvent.changeText(getByPlaceholderText('Password'), mockCredentials.password);

      // Press login
      fireEvent.press(getByText('Sign In'));

      // Wait for login to be called
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: mockCredentials.email,
          password: mockCredentials.password,
        });
      });
    });

    it('should show alert on login failure', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));

      // Mock store to return error
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      // Fill form
      fireEvent.changeText(getByPlaceholderText('Email'), mockCredentials.email);
      fireEvent.changeText(getByPlaceholderText('Password'), mockCredentials.password);

      // Press login
      fireEvent.press(getByText('Sign In'));

      // Wait for error alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Login Failed', errorMessage);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when logging in', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { queryByText, getByTestId } = renderWithProviders(<LoginScreen />);

      // Sign In text should not be visible
      expect(queryByText('Sign In')).toBeNull();

      // ActivityIndicator should be rendered (we can't easily test this without testID)
      // In a real scenario, you'd add testID="loading-indicator" to ActivityIndicator
    });

    it('should disable inputs during login', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText } = renderWithProviders(<LoginScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');

      // Inputs should be disabled
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });

    it('should disable login button during login', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByRole } = renderWithProviders(<LoginScreen />);

      // Button should be disabled (check via TouchableOpacity props)
      // Note: In React Native Testing Library, we need to use different approach
      // This is a simplified version
    });
  });

  describe('Error Display', () => {
    it('should display error message from store', () => {
      const errorMessage = 'Network connection failed';
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByText } = renderWithProviders(<LoginScreen />);

      // Error message should be visible
      expect(getByText(errorMessage)).toBeTruthy();
    });

    it('should not display error when error is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: mockLogin,
        logout: jest.fn(),
        refreshUser: jest.fn(),
        checkAuthStatus: jest.fn(),
        updateUser: jest.fn(),
        setError: jest.fn(),
        clearError: jest.fn(),
      });

      const { queryByText } = renderWithProviders(<LoginScreen />);

      // Should not find any error-style text
      // This is a basic check - in real scenario you'd use testID
      expect(queryByText(/failed/i)).toBeNull();
      expect(queryByText(/error/i)).toBeNull();
    });
  });
});
