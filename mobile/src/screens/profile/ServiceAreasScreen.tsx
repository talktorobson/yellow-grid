/**
 * Yellow Grid Mobile - Service Areas Screen
 * View assigned intervention zones and coverage areas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

interface Zone {
  id: string;
  name: string;
  type: 'PRIMARY' | 'SECONDARY' | 'OVERFLOW';
  postalCodes: string[];
  isActive: boolean;
}

const ServiceAreasScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    // Simulate loading - in production would fetch from API
    setTimeout(() => {
      setZones([
        {
          id: '1',
          name: 'Paris Centre',
          type: 'PRIMARY',
          postalCodes: ['75001', '75002', '75003', '75004', '75005'],
          isActive: true,
        },
        {
          id: '2',
          name: 'Paris Nord',
          type: 'PRIMARY',
          postalCodes: ['75009', '75010', '75017', '75018', '75019'],
          isActive: true,
        },
        {
          id: '3',
          name: 'Banlieue Nord',
          type: 'SECONDARY',
          postalCodes: ['93100', '93200', '93300', '93400'],
          isActive: true,
        },
        {
          id: '4',
          name: 'Grande Couronne',
          type: 'OVERFLOW',
          postalCodes: ['77000', '78000', '91000', '95000'],
          isActive: false,
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  const getZoneColor = (type: Zone['type']) => {
    switch (type) {
      case 'PRIMARY':
        return colors.success[600];
      case 'SECONDARY':
        return colors.warning[600];
      case 'OVERFLOW':
        return colors.gray[500];
    }
  };

  const getZoneBadgeVariant = (type: Zone['type']): 'success' | 'warning' | 'default' => {
    switch (type) {
      case 'PRIMARY':
        return 'success';
      case 'SECONDARY':
        return 'warning';
      case 'OVERFLOW':
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const activeZones = zones.filter(z => z.isActive);
  const inactiveZones = zones.filter(z => !z.isActive);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.info[600]} />
          <Text style={styles.infoText}>
            Service areas are assigned by your provider administrator. Contact them to request changes.
          </Text>
        </Card>

        {/* Active Zones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Zones ({activeZones.length})</Text>
          {activeZones.map((zone) => (
            <Card key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneHeader}>
                <View style={[styles.zoneIcon, { backgroundColor: `${getZoneColor(zone.type)}15` }]}>
                  <Ionicons name="location" size={24} color={getZoneColor(zone.type)} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Badge
                    label={zone.type.replace('_', ' ')}
                    variant={getZoneBadgeVariant(zone.type)}
                    size="sm"
                  />
                </View>
              </View>
              <View style={styles.postalCodesContainer}>
                <Text style={styles.postalCodesLabel}>Postal Codes:</Text>
                <View style={styles.postalCodesList}>
                  {zone.postalCodes.map((code) => (
                    <View key={code} style={styles.postalCodeBadge}>
                      <Text style={styles.postalCodeText}>{code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Inactive Zones */}
        {inactiveZones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inactive Zones ({inactiveZones.length})</Text>
            {inactiveZones.map((zone) => (
              <Card key={zone.id} style={[styles.zoneCard, styles.inactiveCard]}>
                <View style={styles.zoneHeader}>
                  <View style={[styles.zoneIcon, { backgroundColor: colors.gray[100] }]}>
                    <Ionicons name="location-outline" size={24} color={colors.gray[400]} />
                  </View>
                  <View style={styles.zoneInfo}>
                    <Text style={[styles.zoneName, styles.inactiveText]}>{zone.name}</Text>
                    <Badge
                      label={zone.type.replace('_', ' ')}
                      variant="default"
                      size="sm"
                    />
                  </View>
                </View>
                <View style={styles.postalCodesContainer}>
                  <Text style={[styles.postalCodesLabel, styles.inactiveText]}>Postal Codes:</Text>
                  <View style={styles.postalCodesList}>
                    {zone.postalCodes.slice(0, 3).map((code) => (
                      <View key={code} style={[styles.postalCodeBadge, styles.inactiveBadge]}>
                        <Text style={[styles.postalCodeText, styles.inactiveText]}>{code}</Text>
                      </View>
                    ))}
                    {zone.postalCodes.length > 3 && (
                      <Text style={styles.moreText}>+{zone.postalCodes.length - 3} more</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Legend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zone Types</Text>
          <Card style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.success[600] }]} />
              <Text style={styles.legendLabel}>Primary</Text>
              <Text style={styles.legendDescription}>Your main service area</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning[600] }]} />
              <Text style={styles.legendLabel}>Secondary</Text>
              <Text style={styles.legendDescription}>Extended coverage</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.gray[400] }]} />
              <Text style={styles.legendLabel}>Overflow</Text>
              <Text style={styles.legendDescription}>Emergency backup</Text>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.info[50],
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.info[700],
    marginLeft: spacing.sm,
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
  zoneCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  zoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  zoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  inactiveText: {
    color: colors.gray[500],
  },
  postalCodesContainer: {
    marginTop: spacing.sm,
  },
  postalCodesLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xs,
  },
  postalCodesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  postalCodeBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  inactiveBadge: {
    backgroundColor: colors.gray[50],
  },
  postalCodeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    fontWeight: '500' as const,
  },
  moreText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[400],
    alignSelf: 'center',
    marginLeft: spacing.xs,
  },
  legendCard: {
    padding: 0,
    overflow: 'hidden',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  legendLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500' as const,
    color: colors.gray[900],
    width: 80,
  },
  legendDescription: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
  },
});

export default ServiceAreasScreen;
