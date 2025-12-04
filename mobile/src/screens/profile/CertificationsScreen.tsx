/**
 * Yellow Grid Mobile - Certifications Screen
 * View team certifications and their status
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

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedDate: string;
  expiryDate: string | null;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  documentUrl?: string;
}

const CertificationsScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    loadCertifications();
  }, []);

  const loadCertifications = async () => {
    // Simulate loading - in production would fetch from API
    setTimeout(() => {
      setCertifications([
        {
          id: '1',
          name: 'Électricien Qualifié',
          issuer: 'Qualifelec',
          issuedDate: '2023-01-15',
          expiryDate: '2026-01-15',
          status: 'VALID',
        },
        {
          id: '2',
          name: 'Installation Gaz',
          issuer: 'Qualigaz',
          issuedDate: '2022-06-01',
          expiryDate: '2025-06-01',
          status: 'EXPIRING_SOON',
        },
        {
          id: '3',
          name: 'RGE Chauffage',
          issuer: 'Qualibat',
          issuedDate: '2021-03-20',
          expiryDate: '2024-03-20',
          status: 'EXPIRED',
        },
        {
          id: '4',
          name: 'Habilitation Électrique B2V',
          issuer: 'AFNOR',
          issuedDate: '2024-02-10',
          expiryDate: null,
          status: 'VALID',
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  const getStatusColor = (status: Certification['status']) => {
    switch (status) {
      case 'VALID':
        return colors.success[600];
      case 'EXPIRING_SOON':
        return colors.warning[600];
      case 'EXPIRED':
        return colors.danger[600];
    }
  };

  const getStatusBadgeVariant = (status: Certification['status']): 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'VALID':
        return 'success';
      case 'EXPIRING_SOON':
        return 'warning';
      case 'EXPIRED':
        return 'danger';
    }
  };

  const getStatusLabel = (status: Certification['status']) => {
    switch (status) {
      case 'VALID':
        return 'Valid';
      case 'EXPIRING_SOON':
        return 'Expiring Soon';
      case 'EXPIRED':
        return 'Expired';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const validCerts = certifications.filter(c => c.status === 'VALID');
  const expiringCerts = certifications.filter(c => c.status === 'EXPIRING_SOON');
  const expiredCerts = certifications.filter(c => c.status === 'EXPIRED');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { borderLeftColor: colors.success[600] }]}>
            <Text style={styles.summaryNumber}>{validCerts.length}</Text>
            <Text style={styles.summaryLabel}>Valid</Text>
          </Card>
          <Card style={[styles.summaryCard, { borderLeftColor: colors.warning[600] }]}>
            <Text style={styles.summaryNumber}>{expiringCerts.length}</Text>
            <Text style={styles.summaryLabel}>Expiring</Text>
          </Card>
          <Card style={[styles.summaryCard, { borderLeftColor: colors.danger[600] }]}>
            <Text style={styles.summaryNumber}>{expiredCerts.length}</Text>
            <Text style={styles.summaryLabel}>Expired</Text>
          </Card>
        </View>

        {/* Info Banner */}
        <Card style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={colors.info[600]} />
          <Text style={styles.infoText}>
            Certifications are managed by your provider. Contact them to update or add new certifications.
          </Text>
        </Card>

        {/* Certifications List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Certifications</Text>
          {certifications.map((cert) => (
            <Card key={cert.id} style={styles.certCard}>
              <View style={styles.certHeader}>
                <View style={[styles.certIcon, { backgroundColor: `${getStatusColor(cert.status)}15` }]}>
                  <Ionicons 
                    name={cert.status === 'VALID' ? 'ribbon' : cert.status === 'EXPIRING_SOON' ? 'warning' : 'close-circle'} 
                    size={24} 
                    color={getStatusColor(cert.status)} 
                  />
                </View>
                <View style={styles.certInfo}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>{cert.issuer}</Text>
                </View>
                <Badge
                  label={getStatusLabel(cert.status)}
                  variant={getStatusBadgeVariant(cert.status)}
                  size="sm"
                />
              </View>
              <View style={styles.certDates}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Issued</Text>
                  <Text style={styles.dateValue}>{formatDate(cert.issuedDate)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Expires</Text>
                  <Text style={[
                    styles.dateValue,
                    cert.status === 'EXPIRED' && styles.expiredText,
                    cert.status === 'EXPIRING_SOON' && styles.expiringText,
                  ]}>
                    {cert.expiryDate ? formatDate(cert.expiryDate) : 'No expiry'}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
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
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700' as const,
    color: colors.gray[900],
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
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
  certCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  certIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  certInfo: {
    flex: 1,
  },
  certName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600' as const,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  certIssuer: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  certDates: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500' as const,
    color: colors.gray[900],
  },
  expiredText: {
    color: colors.danger[600],
  },
  expiringText: {
    color: colors.warning[600],
  },
});

export default CertificationsScreen;
