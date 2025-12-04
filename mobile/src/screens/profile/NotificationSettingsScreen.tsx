/**
 * Yellow Grid Mobile - Notification Settings Screen
 * Configure push, email, and SMS notification preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/auth.store';
import { apiService } from '../../services/api.service';

interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  eventPreferences: {
    [key: string]: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
}) => (
  <View style={styles.settingRow}>
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {description && <Text style={styles.settingDescription}>{description}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
      thumbColor={value ? colors.primary[600] : colors.gray[100]}
    />
  </View>
);

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    eventPreferences: {},
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      // Try to load from API, fall back to defaults if not found
      try {
        const response = await apiService.get(`/notifications/preferences/${user?.id}`);
        if (response) {
          setPreferences(response as NotificationPreferences);
        }
      } catch {
        // Use defaults if preferences don't exist yet
        console.log('Using default notification preferences');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      await apiService.put(`/notifications/preferences/${user?.id}`, preferences);
      
      if (Platform.OS === 'web') {
        globalThis.alert('Notification preferences saved successfully!');
      } else {
        Alert.alert('Success', 'Notification preferences saved successfully!');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      if (Platform.OS === 'web') {
        globalThis.alert('Failed to save preferences. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateChannel = (channel: 'emailEnabled' | 'smsEnabled' | 'pushEnabled', value: boolean) => {
    setPreferences(prev => ({ ...prev, [channel]: value }));
  };

  const updateEventPreference = (event: string, channel: 'email' | 'sms' | 'push', value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        [event]: {
          ...prev.eventPreferences[event],
          [channel]: value,
        },
      },
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Channels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          <Text style={styles.sectionDescription}>
            Choose how you want to receive notifications
          </Text>
          <Card style={styles.card}>
            <SettingRow
              icon="notifications"
              iconColor={colors.primary[600]}
              title="Push Notifications"
              description="Receive alerts on your device"
              value={preferences.pushEnabled}
              onValueChange={(v) => updateChannel('pushEnabled', v)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="mail"
              iconColor={colors.info[600]}
              title="Email Notifications"
              description="Receive updates via email"
              value={preferences.emailEnabled}
              onValueChange={(v) => updateChannel('emailEnabled', v)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubble"
              iconColor={colors.success[600]}
              title="SMS Notifications"
              description="Receive text messages"
              value={preferences.smsEnabled}
              onValueChange={(v) => updateChannel('smsEnabled', v)}
            />
          </Card>
        </View>

        {/* Event Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Types</Text>
          <Text style={styles.sectionDescription}>
            Configure notifications for specific events
          </Text>
          <Card style={styles.card}>
            <SettingRow
              icon="briefcase"
              iconColor={colors.warning[600]}
              title="New Assignments"
              description="When a new job is assigned to you"
              value={preferences.eventPreferences['assignment.new']?.push ?? true}
              onValueChange={(v) => updateEventPreference('assignment.new', 'push', v)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="calendar"
              iconColor={colors.info[600]}
              title="Schedule Changes"
              description="When your schedule is updated"
              value={preferences.eventPreferences['schedule.changed']?.push ?? true}
              onValueChange={(v) => updateEventPreference('schedule.changed', 'push', v)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="chatbubbles"
              iconColor={colors.success[600]}
              title="Chat Messages"
              description="When you receive new messages"
              value={preferences.eventPreferences['chat.message']?.push ?? true}
              onValueChange={(v) => updateEventPreference('chat.message', 'push', v)}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="megaphone"
              iconColor={colors.danger[600]}
              title="System Announcements"
              description="Important platform updates"
              value={preferences.eventPreferences['system.announcement']?.push ?? true}
              onValueChange={(v) => updateEventPreference('system.announcement', 'push', v)}
            />
          </Card>
        </View>

        {/* Quiet Hours Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <Text style={styles.sectionDescription}>
            Pause notifications during specific hours
          </Text>
          <Card style={styles.card}>
            <SettingRow
              icon="moon"
              iconColor={colors.gray[700]}
              title="Enable Quiet Hours"
              description="No notifications during set times"
              value={preferences.quietHoursEnabled}
              onValueChange={(v) => setPreferences(prev => ({ ...prev, quietHoursEnabled: v }))}
            />
            {preferences.quietHoursEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.quietHoursInfo}>
                  <Ionicons name="time-outline" size={20} color={colors.gray[500]} />
                  <Text style={styles.quietHoursText}>
                    {preferences.quietHoursStart || '22:00'} - {preferences.quietHoursEnd || '07:00'}
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Save Preferences"
            variant="primary"
            size="lg"
            onPress={savePreferences}
            loading={isSaving}
            disabled={isSaving}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 72,
  },
  quietHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingLeft: 72,
  },
  quietHoursText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
});

export default NotificationSettingsScreen;
