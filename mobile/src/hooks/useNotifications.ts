import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { notificationService } from '@services/notification.service';
import type { RootStackParamList } from '@navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const useNotifications = () => {
  const navigation = useNavigation<NavigationProp>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotifications().then((token) => {
      if (token) {
        console.log('Push token:', token);
      }
    });

    // Handle notifications received while app is in foreground
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // You can show a custom UI here or update state
      }
    );

    // Handle notification interactions (taps)
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        handleNotificationNavigation(response.notification.request.content.data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const handleNotificationNavigation = (data: Record<string, unknown>) => {
    // Navigate based on notification type
    const { type, serviceOrderId, assignmentId } = data as {
      type?: string;
      serviceOrderId?: string;
      assignmentId?: string;
    };

    switch (type) {
      case 'new_assignment':
        if (serviceOrderId) {
          // Navigate to service order detail
          navigation.navigate('Main', {
            screen: 'ServiceOrders',
            params: {
              screen: 'ServiceOrderDetail',
              params: { orderId: serviceOrderId },
            },
          });
        }
        break;

      case 'assignment_update':
        if (serviceOrderId) {
          navigation.navigate('Main', {
            screen: 'ServiceOrders',
            params: {
              screen: 'ServiceOrderDetail',
              params: { orderId: serviceOrderId },
            },
          });
        }
        break;

      case 'service_order_update':
        if (serviceOrderId) {
          navigation.navigate('Main', {
            screen: 'ServiceOrders',
            params: {
              screen: 'ServiceOrderDetail',
              params: { orderId: serviceOrderId },
            },
          });
        }
        break;

      default:
        // Navigate to home
        navigation.navigate('Main', {
          screen: 'ServiceOrders',
        });
    }
  };

  return {
    scheduleNotification: notificationService.scheduleLocalNotification.bind(
      notificationService
    ),
    cancelNotification: notificationService.cancelNotification.bind(notificationService),
    cancelAllNotifications: notificationService.cancelAllNotifications.bind(
      notificationService
    ),
    getBadgeCount: notificationService.getBadgeCount.bind(notificationService),
    setBadgeCount: notificationService.setBadgeCount.bind(notificationService),
    clearBadge: notificationService.clearBadge.bind(notificationService),
  };
};
