/**
 * Yellow Grid Mobile - Profile Screen
 * User profile with settings and logout
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/auth.store';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor = colors.gray[600],
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightElement,
}) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
    {showArrow && onPress && (
      <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
    )}
  </TouchableOpacity>
);

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?';
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'WORK_TEAM':
        return 'Work Team';
      case 'TEAM_LEAD':
        return 'Team Lead';
      case 'PROVIDER_ADMIN':
        return 'Provider Admin';
      case 'OPERATOR':
        return 'Operator';
      case 'PSM':
        return 'PSM';
      case 'SELLER':
        return 'Seller';
      case 'ADMIN':
        return 'Administrator';
      case 'SUPER_ADMIN':
        return 'Super Admin';
      default:
        return role || 'User';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {(user as any)?.avatar ? (
              <Image source={{ uri: (user as any).avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userRole}>{getRoleName(user?.role)}</Text>
          {(user as any)?.providerName && (
            <View style={styles.providerBadge}>
              <Ionicons name="business" size={14} color={colors.primary[600]} />
              <Text style={styles.providerName}>{(user as any).providerName}</Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="person"
              iconColor={colors.primary[600]}
              title="Personal Information"
              subtitle={user?.email}
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="key"
              iconColor={colors.warning[600]}
              title="Change Password"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="notifications"
              iconColor={colors.info[600]}
              title="Notifications"
              subtitle="Push, Email, SMS"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Work Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="calendar"
              iconColor={colors.success[600]}
              title="Availability"
              subtitle="Set your working hours"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="location"
              iconColor={colors.danger[600]}
              title="Service Areas"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="ribbon"
              iconColor={colors.primary[600]}
              title="Certifications"
              subtitle="View your certifications"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="language"
              iconColor={colors.gray[600]}
              title="Language"
              subtitle="English"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="moon"
              iconColor={colors.gray[800]}
              title="Dark Mode"
              showArrow={false}
              rightElement={
                <View style={styles.togglePlaceholder}>
                  <Text style={styles.toggleText}>Off</Text>
                </View>
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="sync"
              iconColor={colors.info[600]}
              title="Sync Data"
              subtitle="Last synced: Just now"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card style={styles.settingsCard}>
            <SettingItem
              icon="help-circle"
              iconColor={colors.primary[600]}
              title="Help & FAQ"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble"
              iconColor={colors.success[600]}
              title="Contact Support"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text"
              iconColor={colors.gray[600]}
              title="Terms & Privacy"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button
            title="Log Out"
            variant="danger"
            size="large"
            icon={<Ionicons name="log-out" size={20} color={colors.white} />}
            onPress={handleLogout}
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Yellow Grid Mobile v2.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 ADEO. All rights reserved.</Text>
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
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold as '700',
    color: colors.primary[600],
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as '700',
    color: colors.gray[900],
  },
  userRole: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginTop: spacing[1],
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: spacing.lg,
  },
  providerName: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    fontWeight: typography.fontWeight.medium as '500',
    marginLeft: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
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
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as '500',
    color: colors.gray[900],
  },
  settingSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 72,
  },
  togglePlaceholder: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray[200],
    borderRadius: spacing.sm,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium as '500',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
});

export default ProfileScreen;
