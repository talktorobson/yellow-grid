/**
 * Yellow Grid Mobile - Terms & Privacy Screen
 * Legal documents viewer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';

type DocumentTab = 'terms' | 'privacy' | 'cookies';

const TermsPrivacyScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocumentTab>('terms');

  const tabs: { key: DocumentTab; label: string }[] = [
    { key: 'terms', label: 'Terms of Use' },
    { key: 'privacy', label: 'Privacy Policy' },
    { key: 'cookies', label: 'Cookies' },
  ];

  const openExternalLink = (url: string) => {
    Linking.openURL(url);
  };

  const renderTermsContent = () => (
    <View style={styles.content}>
      <Text style={styles.lastUpdated}>Last updated: December 1, 2025</Text>
      
      <Text style={styles.heading}>1. Acceptance of Terms</Text>
      <Text style={styles.paragraph}>
        By accessing and using the Yellow Grid Work Team mobile application ("App"), you accept and agree to be bound by the terms and conditions outlined in this agreement.
      </Text>

      <Text style={styles.heading}>2. Service Description</Text>
      <Text style={styles.paragraph}>
        Yellow Grid provides a platform connecting service providers with customers through our network of work teams. The App enables you to receive and manage service orders, communicate with customers and operators, and track your work performance.
      </Text>

      <Text style={styles.heading}>3. User Obligations</Text>
      <Text style={styles.paragraph}>
        As a work team user, you agree to:{'\n'}
        • Provide accurate and current information{'\n'}
        • Maintain the confidentiality of your login credentials{'\n'}
        • Perform services professionally and in accordance with industry standards{'\n'}
        • Comply with all applicable laws and regulations{'\n'}
        • Report any issues or concerns promptly
      </Text>

      <Text style={styles.heading}>4. Service Orders</Text>
      <Text style={styles.paragraph}>
        When you accept a service order, you commit to completing the work as described within the agreed timeframe. Failure to fulfill orders may result in penalties as defined in your service provider agreement.
      </Text>

      <Text style={styles.heading}>5. Communication</Text>
      <Text style={styles.paragraph}>
        All communication through the App is logged and may be reviewed for quality assurance and dispute resolution purposes. Maintain professional conduct in all interactions.
      </Text>

      <Text style={styles.heading}>6. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        Yellow Grid shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App or inability to access the services.
      </Text>
    </View>
  );

  const renderPrivacyContent = () => (
    <View style={styles.content}>
      <Text style={styles.lastUpdated}>Last updated: December 1, 2025</Text>
      
      <Text style={styles.heading}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        We collect information you provide directly, including:{'\n'}
        • Account information (name, email, phone number){'\n'}
        • Location data when you're on an active job{'\n'}
        • Communication logs and messages{'\n'}
        • Performance metrics and ratings
      </Text>

      <Text style={styles.heading}>2. How We Use Your Information</Text>
      <Text style={styles.paragraph}>
        Your information is used to:{'\n'}
        • Assign and manage service orders{'\n'}
        • Facilitate communication with customers and operators{'\n'}
        • Improve our services and user experience{'\n'}
        • Ensure safety and security{'\n'}
        • Comply with legal obligations
      </Text>

      <Text style={styles.heading}>3. Information Sharing</Text>
      <Text style={styles.paragraph}>
        We share your information with:{'\n'}
        • Customers (name and general location for service orders){'\n'}
        • Your service provider company{'\n'}
        • ADEO Group entities as needed{'\n'}
        • Law enforcement when legally required
      </Text>

      <Text style={styles.heading}>4. Data Retention</Text>
      <Text style={styles.paragraph}>
        We retain your data for as long as your account is active and as required by applicable laws. Service order records are kept for 7 years for legal and accounting purposes.
      </Text>

      <Text style={styles.heading}>5. Your Rights (GDPR)</Text>
      <Text style={styles.paragraph}>
        Under GDPR, you have the right to:{'\n'}
        • Access your personal data{'\n'}
        • Rectify inaccurate data{'\n'}
        • Request deletion (with limitations){'\n'}
        • Data portability{'\n'}
        • Object to processing{'\n'}
        {'\n'}
        Contact privacy@yellowgrid.com to exercise these rights.
      </Text>

      <Text style={styles.heading}>6. Data Security</Text>
      <Text style={styles.paragraph}>
        We implement industry-standard security measures including encryption, secure data centers, and regular security audits to protect your information.
      </Text>
    </View>
  );

  const renderCookiesContent = () => (
    <View style={styles.content}>
      <Text style={styles.lastUpdated}>Last updated: December 1, 2025</Text>
      
      <Text style={styles.heading}>Mobile App Data Storage</Text>
      <Text style={styles.paragraph}>
        While the mobile app doesn't use traditional web cookies, we store certain data locally on your device to improve your experience.
      </Text>

      <Text style={styles.heading}>What We Store</Text>
      <Text style={styles.paragraph}>
        • Authentication tokens (to keep you logged in){'\n'}
        • User preferences (language, notification settings){'\n'}
        • Cached data (for offline access and performance){'\n'}
        • App usage analytics (anonymous)
      </Text>

      <Text style={styles.heading}>Third-Party Services</Text>
      <Text style={styles.paragraph}>
        We use the following third-party services that may collect data:{'\n'}
        • Expo (app framework){'\n'}
        • Google Maps (location services){'\n'}
        • Firebase (push notifications){'\n'}
        • Sentry (error reporting)
      </Text>

      <Text style={styles.heading}>Managing Stored Data</Text>
      <Text style={styles.paragraph}>
        You can clear locally stored data by:{'\n'}
        • Logging out of the app{'\n'}
        • Clearing app data in your device settings{'\n'}
        • Uninstalling and reinstalling the app
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.documentCard}>
          {activeTab === 'terms' && renderTermsContent()}
          {activeTab === 'privacy' && renderPrivacyContent()}
          {activeTab === 'cookies' && renderCookiesContent()}
        </Card>

        {/* External Links */}
        <View style={styles.linksSection}>
          <Text style={styles.linksTitle}>More Information</Text>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openExternalLink('https://yellowgrid.com/legal')}
          >
            <Ionicons name="globe" size={20} color={colors.primary[600]} />
            <Text style={styles.linkText}>View full legal documents online</Text>
            <Ionicons name="open-outline" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => openExternalLink('mailto:privacy@yellowgrid.com')}
          >
            <Ionicons name="mail" size={20} color={colors.primary[600]} />
            <Text style={styles.linkText}>Contact our privacy team</Text>
            <Ionicons name="open-outline" size={16} color={colors.gray[400]} />
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Yellow Grid v1.0.0</Text>
          <Text style={styles.versionText}>© 2025 ADEO Services. All rights reserved.</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[600],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500' as const,
    color: colors.gray[500],
  },
  activeTabText: {
    color: colors.primary[600],
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  documentCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  content: {},
  lastUpdated: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    lineHeight: 24,
  },
  linksSection: {
    marginBottom: spacing.xl,
  },
  linksTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  linkText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    marginLeft: spacing.md,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
});

export default TermsPrivacyScreen;
