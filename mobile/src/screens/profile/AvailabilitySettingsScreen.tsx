/**
 * Yellow Grid Mobile - Availability Settings Screen
 * Configure working hours and schedule preferences
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
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

interface WorkingDay {
  day: string;
  enabled: boolean;
  shifts: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AvailabilitySettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>(
    DAYS.map((day, index) => ({
      day,
      enabled: index < 5, // Mon-Fri enabled by default
      shifts: {
        morning: true,
        afternoon: true,
        evening: false,
      },
    }))
  );
  
  const [maxDailyJobs, setMaxDailyJobs] = useState(6);
  const [lunchBreakEnabled, setLunchBreakEnabled] = useState(true);
  const [lunchBreakStart, setLunchBreakStart] = useState('12:00');
  const [lunchBreakDuration, setLunchBreakDuration] = useState(60);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    // Simulate loading - in production would fetch from API
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const toggleDay = (index: number) => {
    setWorkingDays(prev => 
      prev.map((d, i) => i === index ? { ...d, enabled: !d.enabled } : d)
    );
  };

  const toggleShift = (dayIndex: number, shift: 'morning' | 'afternoon' | 'evening') => {
    setWorkingDays(prev =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, shifts: { ...d.shifts, [shift]: !d.shifts[shift] } }
          : d
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Simulate save - in production would POST to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (Platform.OS === 'web') {
        globalThis.alert('Availability settings saved successfully!');
      } else {
        Alert.alert('Success', 'Availability settings saved successfully!');
      }
      navigation.goBack();
    } catch (error) {
      if (Platform.OS === 'web') {
        globalThis.alert('Failed to save settings. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save settings. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
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
        {/* Working Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Working Days</Text>
          <Text style={styles.sectionDescription}>
            Select which days you are available for assignments
          </Text>
          <Card style={styles.card}>
            {workingDays.map((day, index) => (
              <React.Fragment key={day.day}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.dayRow}
                  onPress={() => toggleDay(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dayInfo}>
                    <Text style={[styles.dayName, !day.enabled && styles.dayDisabled]}>
                      {day.day}
                    </Text>
                    {day.enabled && (
                      <View style={styles.shiftsContainer}>
                        <TouchableOpacity
                          style={[styles.shiftBadge, day.shifts.morning && styles.shiftActive]}
                          onPress={() => toggleShift(index, 'morning')}
                        >
                          <Text style={[styles.shiftText, day.shifts.morning && styles.shiftTextActive]}>
                            AM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.shiftBadge, day.shifts.afternoon && styles.shiftActive]}
                          onPress={() => toggleShift(index, 'afternoon')}
                        >
                          <Text style={[styles.shiftText, day.shifts.afternoon && styles.shiftTextActive]}>
                            PM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.shiftBadge, day.shifts.evening && styles.shiftActive]}
                          onPress={() => toggleShift(index, 'evening')}
                        >
                          <Text style={[styles.shiftText, day.shifts.evening && styles.shiftTextActive]}>
                            EVE
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={day.enabled}
                    onValueChange={() => toggleDay(index)}
                    trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
                    thumbColor={day.enabled ? colors.primary[600] : colors.gray[100]}
                  />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </Card>
        </View>

        {/* Daily Capacity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Capacity</Text>
          <Text style={styles.sectionDescription}>
            Maximum number of jobs per day
          </Text>
          <Card style={styles.card}>
            <View style={styles.capacityRow}>
              <Ionicons name="briefcase" size={24} color={colors.primary[600]} />
              <Text style={styles.capacityLabel}>Max Jobs Per Day</Text>
              <View style={styles.capacityControls}>
                <TouchableOpacity
                  style={styles.capacityButton}
                  onPress={() => setMaxDailyJobs(Math.max(1, maxDailyJobs - 1))}
                >
                  <Ionicons name="remove" size={20} color={colors.gray[600]} />
                </TouchableOpacity>
                <Text style={styles.capacityValue}>{maxDailyJobs}</Text>
                <TouchableOpacity
                  style={styles.capacityButton}
                  onPress={() => setMaxDailyJobs(Math.min(12, maxDailyJobs + 1))}
                >
                  <Ionicons name="add" size={20} color={colors.gray[600]} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        {/* Lunch Break */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch Break</Text>
          <Card style={styles.card}>
            <View style={styles.lunchRow}>
              <View style={styles.lunchInfo}>
                <Ionicons name="restaurant" size={24} color={colors.warning[600]} />
                <View style={styles.lunchText}>
                  <Text style={styles.lunchTitle}>Lunch Break</Text>
                  <Text style={styles.lunchTime}>
                    {lunchBreakStart} ({lunchBreakDuration} min)
                  </Text>
                </View>
              </View>
              <Switch
                value={lunchBreakEnabled}
                onValueChange={setLunchBreakEnabled}
                trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
                thumbColor={lunchBreakEnabled ? colors.primary[600] : colors.gray[100]}
              />
            </View>
          </Card>
        </View>

        {/* Shift Times Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Times</Text>
          <Card style={styles.card}>
            <View style={styles.shiftInfoRow}>
              <Ionicons name="sunny" size={20} color={colors.warning[500]} />
              <Text style={styles.shiftInfoLabel}>Morning (AM)</Text>
              <Text style={styles.shiftInfoTime}>08:00 - 12:00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.shiftInfoRow}>
              <Ionicons name="partly-sunny" size={20} color={colors.info[500]} />
              <Text style={styles.shiftInfoLabel}>Afternoon (PM)</Text>
              <Text style={styles.shiftInfoTime}>12:00 - 17:00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.shiftInfoRow}>
              <Ionicons name="moon" size={20} color={colors.gray[600]} />
              <Text style={styles.shiftInfoLabel}>Evening (EVE)</Text>
              <Text style={styles.shiftInfoTime}>17:00 - 21:00</Text>
            </View>
          </Card>
        </View>

        {/* Save Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Save Availability"
            variant="primary"
            size="lg"
            onPress={handleSave}
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  dayDisabled: {
    color: colors.gray[400],
  },
  shiftsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  shiftBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.gray[100],
  },
  shiftActive: {
    backgroundColor: colors.primary[100],
  },
  shiftText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600' as const,
    color: colors.gray[500],
  },
  shiftTextActive: {
    color: colors.primary[700],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  capacityLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
    marginLeft: spacing.md,
  },
  capacityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  capacityValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700' as const,
    color: colors.gray[900],
    minWidth: 40,
    textAlign: 'center',
  },
  lunchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  lunchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lunchText: {
    marginLeft: spacing.md,
  },
  lunchTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
  },
  lunchTime: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  shiftInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  shiftInfoLabel: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    marginLeft: spacing.md,
  },
  shiftInfoTime: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontWeight: '500' as const,
  },
  buttonContainer: {
    marginTop: spacing.lg,
  },
});

export default AvailabilitySettingsScreen;
