/**
 * Yellow Grid Mobile - Service Order Detail Screen
 * Comprehensive order details with tabs for overview, checklist, and documents
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { StatusBadge, UrgencyBadge, Badge, BadgeVariant } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { serviceOrdersService } from '../../services/service-orders.service';
import type { ServiceOrder } from '../../types/service-order';
import type { OrdersStackParamList } from '../../navigation/MainNavigator';

type TabType = 'overview' | 'checklist' | 'documents' | 'chat';

interface ChecklistItemData {
  id: string;
  description: string;
  isMandatory: boolean;
  isCompleted: boolean;
  photoRequired: boolean;
  photoUrl?: string;
}

type NavigationProp = NativeStackNavigationProp<OrdersStackParamList>;

const ServiceOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<{ params: { orderId: string } }, 'params'>>();
  const orderId = route.params?.orderId;

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [checklist, setChecklist] = useState<ChecklistItemData[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await serviceOrdersService.getServiceOrder(orderId);
      setOrder(data);

      // Mock checklist for demonstration
      setChecklist([
        { id: '1', description: 'Verify customer identity', isMandatory: true, isCompleted: false, photoRequired: false },
        { id: '2', description: 'Take photo of work area before', isMandatory: true, isCompleted: false, photoRequired: true },
        { id: '3', description: 'Complete installation/repair', isMandatory: true, isCompleted: false, photoRequired: false },
        { id: '4', description: 'Test functionality', isMandatory: true, isCompleted: false, photoRequired: false },
        { id: '5', description: 'Take photo of completed work', isMandatory: true, isCompleted: false, photoRequired: true },
        { id: '6', description: 'Get customer signature', isMandatory: true, isCompleted: false, photoRequired: false },
        { id: '7', description: 'Clean up work area', isMandatory: false, isCompleted: false, photoRequired: false },
      ]);
    } catch (error) {
      console.error('Failed to load order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleCheckIn = async () => {
    if (!order) return;
    setIsActionLoading(true);
    try {
      await serviceOrdersService.checkIn(order.id, {
        latitude: 0,
        longitude: 0,
      });
      await loadOrder();
      Alert.alert('Success', 'Checked in successfully');
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!order) return;
    setIsActionLoading(true);
    try {
      await serviceOrdersService.checkOut(order.id, {
        latitude: 0,
        longitude: 0,
        workDescription: 'Work completed',
      });
      await loadOrder();
      Alert.alert('Success', 'Checked out successfully');
    } catch (error) {
      console.error('Check-out error:', error);
      Alert.alert('Error', 'Failed to check out');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNavigate = () => {
    if (!order?.serviceAddress) return;
    const address = `${order.serviceAddress.street}, ${order.serviceAddress.city}, ${order.serviceAddress.postalCode}`;
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      )
    );
  };

  const getRiskBadgeVariant = (riskLevel: string | undefined): BadgeVariant => {
    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') return 'danger';
    if (riskLevel === 'MEDIUM') return 'warning';
    return 'info';
  };

  const renderActionButton = () => {
    if (!order) return null;

    if (order.status === 'ASSIGNED' || order.status === 'ACCEPTED') {
      return (
        <Button
          title="Check In"
          variant="primary"
          size="lg"
          icon={<Ionicons name="log-in" size={20} color={colors.white} />}
          onPress={handleCheckIn}
          loading={isActionLoading}
          fullWidth
        />
      );
    }

    if (order.status === 'IN_PROGRESS') {
      return (
        <Button
          title="Check Out"
          variant="success"
          size="lg"
          icon={<Ionicons name="log-out" size={20} color={colors.white} />}
          onPress={handleCheckOut}
          loading={isActionLoading}
          fullWidth
        />
      );
    }

    return (
      <Button
        title="View Summary"
        variant="secondary"
        size="lg"
        icon={<Ionicons name="document-text" size={20} color={colors.gray[700]} />}
        onPress={() => {}}
        fullWidth
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.danger[500]} />
        <Text style={styles.errorText}>Order not found</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="primary" />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Status and Actions */}
      <Card variant="elevated" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View>
            <Text style={styles.orderNumber}>#{order.externalId || order.id.slice(0, 8)}</Text>
            <View style={styles.badgeRow}>
              {order.status !== 'ASSIGNED' && <StatusBadge status={order.status} />}
              {order.urgency && (
                <View style={{ marginLeft: order.status !== 'ASSIGNED' ? spacing.xs : 0 }}>
                  <UrgencyBadge urgency={order.urgency} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionButtons}>
          {renderActionButton()}
        </View>
      </Card>

      {/* Customer Info */}
      <Card style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="person" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Customer</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={colors.gray[500]} />
          <Text style={styles.infoText}>{order.customerName || 'N/A'}</Text>
        </View>
        {order.customerPhone && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
          >
            <Ionicons name="call-outline" size={18} color={colors.primary[600]} />
            <Text style={[styles.infoText, styles.linkText]}>{order.customerPhone}</Text>
          </TouchableOpacity>
        )}
        {order.customerEmail && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`mailto:${order.customerEmail}`)}
          >
            <Ionicons name="mail-outline" size={18} color={colors.primary[600]} />
            <Text style={[styles.infoText, styles.linkText]}>{order.customerEmail}</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Service Address */}
      <Card style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="location" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Service Address</Text>
          <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
            <Ionicons name="navigate" size={20} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
        <Text style={styles.addressText}>
          {order.serviceAddress?.street}
          {order.serviceAddress?.city && `, ${order.serviceAddress.city}`}
          {order.serviceAddress?.postalCode && ` ${order.serviceAddress.postalCode}`}
        </Text>
      </Card>

      {/* Schedule */}
      <Card style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Schedule</Text>
        </View>
        {order.scheduledTimeSlot ? (
          <View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Start:</Text>
              <Text style={styles.scheduleValue}>{formatDate(order.scheduledTimeSlot.start)}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>End:</Text>
              <Text style={styles.scheduleValue}>{formatDate(order.scheduledTimeSlot.end)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.infoText}>No schedule set</Text>
        )}
      </Card>

      {/* Service Details */}
      <Card style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="construct" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Service Details</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service Type:</Text>
          <Text style={styles.detailValue}>{order.serviceType?.replaceAll('_', ' ') || 'N/A'}</Text>
        </View>
        {order.riskLevel && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Risk Level:</Text>
            <Badge label={order.riskLevel} variant={getRiskBadgeVariant(order.riskLevel)} />
          </View>
        )}
      </Card>

      {/* Line Items */}
      {order.lineItems && order.lineItems.length > 0 && (
        <Card style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="list" size={20} color={colors.primary[600]} />
            <Text style={styles.cardTitle}>Line Items</Text>
          </View>
          {order.lineItems.map((item, index) => (
            <View key={item.id || `item-${index}`} style={styles.lineItem}>
              <View style={styles.lineItemInfo}>
                <Text style={styles.lineItemName}>{item.description || item.name}</Text>
                <Text style={styles.lineItemQty}>Qty: {item.quantity}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </View>
  );

  const renderChecklistTab = () => {
    const completedCount = checklist.filter(item => item.isCompleted).length;
    const mandatoryComplete = checklist
      .filter(item => item.isMandatory)
      .every(item => item.isCompleted);

    return (
      <View style={styles.tabContent}>
        {/* Progress */}
        <Card variant="elevated" style={styles.progressCard}>
          <Text style={styles.progressTitle}>Checklist Progress</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedCount / checklist.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount} of {checklist.length} items completed
          </Text>
          {!mandatoryComplete && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={16} color={colors.warning[600]} />
              <Text style={styles.warningText}>Complete all mandatory items to proceed</Text>
            </View>
          )}
        </Card>

        {/* Checklist Items */}
        {checklist.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => toggleChecklistItem(item.id)}
            activeOpacity={0.7}
          >
            <Card style={item.isCompleted ? { ...styles.checklistCard, ...styles.checklistCardComplete } : styles.checklistCard}>
              <View style={styles.checklistRow}>
                <TouchableOpacity
                  style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}
                  onPress={() => toggleChecklistItem(item.id)}
                >
                  {item.isCompleted && (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  )}
                </TouchableOpacity>
                <View style={styles.checklistContent}>
                  <View style={styles.checklistHeader}>
                    <Text style={[styles.checklistText, item.isCompleted && styles.checklistTextComplete]}>
                      {item.description}
                    </Text>
                    {item.isMandatory && <Badge label="Required" variant="danger" size="sm" />}
                  </View>
                  {item.photoRequired && (
                    <TouchableOpacity style={styles.photoButton}>
                      <Ionicons
                        name={item.photoUrl ? 'image' : 'camera-outline'}
                        size={16}
                        color={colors.primary[600]}
                      />
                      <Text style={styles.photoButtonText}>
                        {item.photoUrl ? 'View Photo' : 'Take Photo'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Complete Button */}
        <View style={styles.checklistActions}>
          <Button
            title="Complete Checklist"
            variant={mandatoryComplete ? 'success' : 'secondary'}
            size="lg"
            disabled={!mandatoryComplete}
            onPress={() => Alert.alert('Success', 'Checklist completed!')}
            fullWidth
          />
        </View>
      </View>
    );
  };

  const renderDocumentsTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.emptyCard}>
        <Ionicons name="document-text-outline" size={48} color={colors.gray[300]} />
        <Text style={styles.emptyText}>No documents attached</Text>
        <Button
          title="Upload Document"
          variant="outline"
          size="sm"
          icon={<Ionicons name="cloud-upload-outline" size={18} color={colors.primary[600]} />}
          onPress={() => {}}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <View style={styles.documentActions}>
        <Button
          title="Take Photo"
          variant="primary"
          size="lg"
          icon={<Ionicons name="camera" size={20} color={colors.white} />}
          onPress={() => {}}
          fullWidth
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          title="Record Voice Note"
          variant="outline"
          size="lg"
          icon={<Ionicons name="mic" size={20} color={colors.primary[600]} />}
          onPress={() => {}}
          fullWidth
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'checklist' && styles.activeTab]}
          onPress={() => setActiveTab('checklist')}
        >
          <Text style={[styles.tabText, activeTab === 'checklist' && styles.activeTabText]}>
            Checklist
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
            Documents
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
          onPress={() => navigation.navigate('Chat', {
            orderId: order.id,
            orderNumber: order.externalId || order.id.slice(0, 8),
          })}
        >
          <View style={styles.chatTabContent}>
            <Ionicons
              name="chatbubbles-outline"
              size={16}
              color={activeTab === 'chat' ? colors.primary[600] : colors.gray[500]}
            />
            <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
              Chat
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'checklist' && renderChecklistTab()}
        {activeTab === 'documents' && renderDocumentsTab()}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray[50],
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.gray[600],
    marginVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
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
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[500],
  },
  activeTabText: {
    color: colors.primary[600],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  tabContent: {
    padding: spacing.md,
  },
  statusCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusHeader: {
    marginBottom: spacing.lg,
  },
  orderNumber: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    gap: spacing.sm,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginLeft: spacing.sm,
    flex: 1,
  },
  navigateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    marginLeft: spacing.sm,
  },
  linkText: {
    color: colors.primary[600],
  },
  addressText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    lineHeight: 22,
  },
  scheduleRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  scheduleLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    width: 50,
  },
  scheduleValue: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    fontWeight: typography.fontWeight.medium,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginRight: spacing.sm,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    textTransform: 'capitalize',
  },
  lineItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  lineItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineItemName: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    flex: 1,
  },
  lineItemQty: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
  progressCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success[500],
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning[700],
    marginLeft: spacing.sm,
  },
  checklistCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checklistCardComplete: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[500],
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  checklistContent: {
    flex: 1,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  checklistText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    flex: 1,
    marginRight: spacing.sm,
  },
  checklistTextComplete: {
    color: colors.gray[500],
    textDecorationLine: 'line-through',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    marginLeft: spacing.xs,
  },
  checklistActions: {
    marginTop: spacing.lg,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
  },
  documentActions: {
    marginTop: spacing.lg,
  },
  chatTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

export default ServiceOrderDetailScreen;
