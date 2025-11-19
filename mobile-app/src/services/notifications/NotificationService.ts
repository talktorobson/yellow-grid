import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import apiClient from '../../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async registerForPushNotificationsAsync(): Promise<string | undefined> {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Get the token that uniquely identifies this device
      token = (await Notifications.getExpoPushTokenAsync({
        // projectId: 'your-project-id', // Get from app.json or env
      })).data;
      
      console.log('Push Token:', token);

      // Send to backend
      await this.sendTokenToBackend(token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  private async sendTokenToBackend(token: string) {
    try {
      await apiClient.post('/notifications/register-device', {
        token,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Failed to send push token to backend', error);
    }
  }
}
