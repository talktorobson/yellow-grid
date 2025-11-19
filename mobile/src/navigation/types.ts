import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  ServiceOrders: undefined;
  Schedule: undefined;
  Inventory: undefined;
  Executions: undefined;
  Profile: undefined;
};

// Service Orders Stack
export type ServiceOrdersStackParamList = {
  ServiceOrdersList: undefined;
  ServiceOrderDetail: { orderId: string };
};

// Executions Stack
export type ExecutionsStackParamList = {
  ExecutionsList: undefined;
  ExecutionDetail: { serviceOrderId: string };
  CheckIn: { serviceOrderId: string };
  CheckOut: { serviceOrderId: string };
  MediaCapture: { serviceOrderId: string; type: 'arrival' | 'work' | 'completion' };
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Screen props types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = BottomTabScreenProps<
  MainTabParamList,
  T
>;

export type ServiceOrdersStackScreenProps<T extends keyof ServiceOrdersStackParamList> =
  NativeStackScreenProps<ServiceOrdersStackParamList, T>;

export type ExecutionsStackScreenProps<T extends keyof ExecutionsStackParamList> =
  NativeStackScreenProps<ExecutionsStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
