/**
 * Yellow Grid Mobile - Home Dashboard Screen
 * Modern dashboard with today's schedule, quick actions, and stats
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { StatusBadge, UrgencyBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/auth.store';
import { serviceOrdersService } from '../../services/service-orders.service';
import type { ServiceOrder, Urgency } from '../../types/service-order';

interface DayStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayOrders, setTodayOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState<DayStats>({ total: 0, completed: 0, inProgress: 0, pending: 0 });

  const loadData = useCallback(async () => {
    try {
      const orders = await serviceOrdersService.getTodayOrders();
      setTodayOrders(orders);

      // Calculate stats
      const newStats: DayStats = {
        total: orders.length,
        completed: orders.filter((o) => o.status === 'COMPLETED' || o.status === 'VALIDATED').length,
        inProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
        pending: orders.filter((o) => o.status === 'ASSIGNED' || o.status === 'ACCEPTED').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load today orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTimeSlot = (order: ServiceOrder) => {
    if (!order.scheduledTimeSlot) return 'All day';
    const start = new Date(order.scheduledTimeSlot.start);
    const end = new Date(order.scheduledTimeSlot.end);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getNextOrder = () => {
    const now = new Date();
    return todayOrders.find((order) => {
      if (order.status === 'COMPLETED' || order.status === 'VALIDATED') return false;
      if (!order.scheduledTimeSlot) return true;
      const start = new Date(order.scheduledTimeSlot.start);
      return start > now || order.status === 'IN_PROGRESS';
    });
  };

  const navigateToOrder = (orderId: string) => {
    // @ts-ignore - Navigation will be fixed with proper types
    navigation.navigate('Orders', {
      screen: 'ServiceOrderDetail',
      params: { orderId },
    });
  };

  const navigateToOrders = () => {
    // @ts-ignore
    navigation.navigate('Orders');
  };

  const navigateToAgenda = () => {
    // @ts-ignore
    navigation.navigate('Agenda');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const nextOrder = getNextOrder();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary[600]]} />
        }
      >
        {/* Header with greeting */}
        <LinearGradient
          colors={[colors.primary[600], colors.primary[700]]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{user?.firstName || 'Team Member'}</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Today's Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={navigateToOrders}>
              <View style={[styles.actionIcon, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="list" size={24} color={colors.primary[600]} />
              </View>
              <Text style={styles.actionText}>My Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={navigateToAgenda}>
              <View style={[styles.actionIcon, { backgroundColor: colors.info[100] }]}>
                <Ionicons name="calendar" size={24} color={colors.info[600]} />
              </View>
              <Text style={styles.actionText}>Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: colors.warning[100] }]}>
                <Ionicons name="camera" size={24} color={colors.warning[600]} />
              </View>
              <Text style={styles.actionText}>Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: colors.success[100] }]}>
                <Ionicons name="document-text" size={24} color={colors.success[600]} />
              </View>
              <Text style={styles.actionText}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next Appointment */}
        {nextOrder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Appointment</Text>
            <TouchableOpacity onPress={() => navigateToOrder(nextOrder.id)} activeOpacity={0.7}>
              <Card variant="elevated" style={styles.nextOrderCard}>
                <View style={styles.nextOrderHeader}>
                  <View style={styles.nextOrderInfo}>
                    <Text style={styles.nextOrderTime}>{formatTimeSlot(nextOrder)}</Text>
                    <Text style={styles.nextOrderNumber}>#{nextOrder.externalId || nextOrder.id.slice(0, 8)}</Text>
                  </View>
                  <View style={styles.badgeContainer}>
                    {nextOrder.status !== 'ASSIGNED' && <StatusBadge status={nextOrder.status} />}
                    {nextOrder.urgency === 'URGENT' && (
                      <View style={{ marginLeft: nextOrder.status !== 'ASSIGNED' ? spacing.xs : 0 }}>
                        <UrgencyBadge urgency={nextOrder.urgency as Urgency} />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.nextOrderCustomer}>
                  <Ionicons name="person" size={16} color={colors.gray[500]} />
                  <Text style={styles.nextOrderCustomerName}>
                    {nextOrder.customerName || 'Customer'}
                  </Text>
                </View>

                <View style={styles.nextOrderAddress}>
                  <Ionicons name="location" size={16} color={colors.gray[500]} />
                  <Text style={styles.nextOrderAddressText} numberOfLines={1}>
                    {nextOrder.serviceAddress?.city || nextOrder.customerAddress || 'Address not available'}
                  </Text>
                </View>

                <View style={styles.nextOrderService}>
                  <Ionicons name="construct" size={16} color={colors.gray[500]} />
                  <Text style={styles.nextOrderServiceText}>
                    {nextOrder.serviceType?.replaceAll('_', ' ') || 'Service'}
                  </Text>
                </View>

                <View style={styles.nextOrderActions}>
                  <Button
                    title="Start Navigation"
                    variant="ghost"
                    size="sm"
                    icon={<Ionicons name="navigate" size={16} color={colors.primary[600]} />}
                    onPress={() => {}}
                    style={{ flex: 1, marginRight: spacing.xs }}
                  />
                  <Button
                    title="View Details"
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="arrow-forward" size={16} color={colors.white} />}
                    style={{ flex: 1, marginLeft: spacing.xs }}
                    onPress={() => navigateToOrder(nextOrder.id)}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={navigateToAgenda}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {todayOrders.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={48} color={colors.gray[300]} />
              <Text style={styles.emptyText}>No appointments scheduled for today</Text>
              <Button
                title="View All Orders"
                variant="ghost"
                size="sm"
                onPress={navigateToOrders}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : (
            todayOrders.slice(0, 4).map((order) => (
              <TouchableOpacity key={order.id} onPress={() => navigateToOrder(order.id)} activeOpacity={0.7}>
                <Card style={styles.scheduleCard}>
                  <View style={styles.scheduleCardContent}>
                    <View style={styles.scheduleTime}>
                      <Text style={styles.scheduleTimeText}>
                        {order.scheduledTimeSlot
                          ? new Date(order.scheduledTimeSlot.start).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--:--'}
                      </Text>
                    </View>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleCustomer} numberOfLines={1}>
                        {order.customerName || 'Customer'}
                      </Text>
                      <Text style={styles.scheduleAddress} numberOfLines={1}>
                        {order.serviceAddress?.city || order.customerAddress || 'No address'}
                      </Text>
                    </View>
                    {order.status !== 'ASSIGNED' && <StatusBadge status={order.status} size="sm" />}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
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
    paddingBottom: spacing['2xl'],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    borderBottomLeftRadius: spacing['2xl'],
    borderBottomRightRadius: spacing['2xl'],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[100],
    fontWeight: typography.fontWeight.medium,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize['2xl'],
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[100],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
  nextOrderCard: {
    padding: spacing.lg,
  },
  nextOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  nextOrderInfo: {},
  nextOrderTime: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  nextOrderNumber: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextOrderCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nextOrderCustomerName: {
    fontSize: typography.fontSize.base,
    color: colors.gray[800],
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
  },
  nextOrderAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nextOrderAddressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing.sm,
    flex: 1,
  },
  nextOrderService: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  nextOrderServiceText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing.sm,
    textTransform: 'capitalize',
  },
  nextOrderActions: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  scheduleCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  scheduleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleTime: {
    width: 56,
    marginRight: spacing.md,
  },
  scheduleTimeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  scheduleInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  scheduleCustomer: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[800],
  },
  scheduleAddress: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default HomeScreen;
