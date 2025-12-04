/**
 * Yellow Grid Mobile - Contact Support Screen
 * Contact options for getting help
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';

interface ContactOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  action: () => void;
}

const ContactSupportScreen: React.FC = () => {
  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Could not open phone app');
      });
  };

  const handleEmail = (email: string, subject: string) => {
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Email is not supported on this device');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Could not open email app');
      });
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const url = `whatsapp://send?phone=${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Available', 'Please install WhatsApp to use this feature');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Could not open WhatsApp');
      });
  };

  const contactOptions: ContactOption[] = [
    {
      id: 'phone',
      title: 'Call Support',
      subtitle: '+33 1 23 45 67 89',
      icon: 'call',
      iconColor: colors.success[600],
      action: () => handleCall('+33123456789'),
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Chat with support team',
      icon: 'logo-whatsapp',
      iconColor: '#25D366',
      action: () => handleWhatsApp('+33123456789'),
    },
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'support@yellowgrid.com',
      icon: 'mail',
      iconColor: colors.primary[600],
      action: () => handleEmail('support@yellowgrid.com', 'Support Request - Work Team App'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="headset" size={48} color={colors.primary[600]} />
          </View>
          <Text style={styles.headerTitle}>How can we help?</Text>
          <Text style={styles.headerSubtitle}>
            Choose your preferred way to reach our support team
          </Text>
        </View>

        {/* Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Options</Text>
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.7}
              onPress={option.action}
            >
              <Card style={styles.optionCard}>
                <View style={[styles.optionIcon, { backgroundColor: `${option.iconColor}15` }]}>
                  <Ionicons name={option.icon} size={28} color={option.iconColor} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.gray[400]} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support Hours</Text>
          <Card style={styles.hoursCard}>
            <View style={styles.hoursRow}>
              <Ionicons name="time" size={20} color={colors.gray[500]} />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursLabel}>Monday - Friday</Text>
                <Text style={styles.hoursValue}>8:00 AM - 8:00 PM (CET)</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.hoursRow}>
              <Ionicons name="time" size={20} color={colors.gray[500]} />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursLabel}>Saturday</Text>
                <Text style={styles.hoursValue}>9:00 AM - 5:00 PM (CET)</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.hoursRow}>
              <Ionicons name="time" size={20} color={colors.gray[500]} />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursLabel}>Sunday</Text>
                <Text style={styles.hoursValue}>Closed</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Emergency */}
        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={24} color={colors.warning[600]} />
            <Text style={styles.emergencyTitle}>Emergency Support</Text>
          </View>
          <Text style={styles.emergencyText}>
            For urgent issues outside business hours (safety concerns, critical system failures), call our emergency line:
          </Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => handleCall('+33987654321')}
          >
            <Ionicons name="call" size={20} color={colors.white} />
            <Text style={styles.emergencyButtonText}>+33 9 87 65 43 21</Text>
          </TouchableOpacity>
        </Card>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before You Contact Us</Text>
          <Card style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
              <Text style={styles.tipText}>Check our FAQ section for quick answers</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
              <Text style={styles.tipText}>Have your work team ID ready</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
              <Text style={styles.tipText}>Note any error messages you've seen</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success[600]} />
              <Text style={styles.tipText}>Know the service order number if applicable</Text>
            </View>
          </Card>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
  },
  optionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
  hoursCard: {
    padding: spacing.lg,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  hoursInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  hoursLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
  },
  hoursValue: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginVertical: spacing.sm,
  },
  emergencyCard: {
    padding: spacing.lg,
    backgroundColor: colors.warning[50],
    borderWidth: 1,
    borderColor: colors.warning[200],
    marginBottom: spacing.xl,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emergencyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.warning[800],
    marginLeft: spacing.sm,
  },
  emergencyText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning[700],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning[600],
    paddingVertical: spacing.md,
    borderRadius: spacing.md,
  },
  emergencyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  tipsCard: {
    padding: spacing.lg,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginLeft: spacing.sm,
    flex: 1,
  },
});

export default ContactSupportScreen;
