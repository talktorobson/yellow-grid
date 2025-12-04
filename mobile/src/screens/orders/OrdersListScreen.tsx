/**
 * Yellow Grid Mobile - Service Orders List Screen
 * Modern list with filters and search
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, UrgencyBadge } from '../../components/ui/Badge';
import { serviceOrdersService } from '../../services/service-orders.service';
import type { ServiceOrder, Urgency } from '../../types/service-order';

type FilterType = 'all' | 'pending' | 'active' | 'completed';

const FILTERS: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'pending', label: 'Pending', icon: 'time-outline' },
  { key: 'active', label: 'Active', icon: 'play-circle-outline' },
  { key: 'completed', label: 'Done', icon: 'checkmark-circle-outline' },
];

const OrdersListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadOrders = useCallback(async () => {
    try {
      const response = await serviceOrdersService.getServiceOrders({
        assignedToMe: true,
        take: 100,
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
      });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let result = orders;

    // Apply filter
    if (activeFilter === 'pending') {
      result = result.filter((o) =>
        ['ASSIGNED', 'ACCEPTED', 'SCHEDULED'].includes(o.status)
      );
    } else if (activeFilter === 'active') {
      result = result.filter((o) => o.status === 'IN_PROGRESS');
    } else if (activeFilter === 'completed') {
      result = result.filter((o) =>
        ['COMPLETED', 'VALIDATED', 'CLOSED'].includes(o.status)
      );
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(query) ||
          o.externalId?.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query) ||
          o.serviceAddress?.city?.toLowerCase().includes(query) ||
          o.customerAddress?.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(result);
  }, [orders, activeFilter, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const navigateToOrder = (orderId: string) => {
    // @ts-ignore
    navigation.navigate('ServiceOrderDetail', { orderId });
  };

  const formatSchedule = (order: ServiceOrder) => {
    if (!order.scheduledDate) return 'Not scheduled';
    const date = new Date(order.scheduledDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    if (order.scheduledTimeSlot) {
      const time = new Date(order.scheduledTimeSlot.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${dateStr} • ${time}`;
    }

    return dateStr;
  };

  const getEmptyMessage = (): string => {
    if (searchQuery) {
      return 'Try a different search term';
    }
    if (activeFilter !== 'all') {
      return 'No orders match this filter';
    }
    return 'You have no assigned orders';
  };

  const renderOrderItem = ({ item }: { item: ServiceOrder }) => (
    <TouchableOpacity onPress={() => navigateToOrder(item.id)} activeOpacity={0.7}>
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{item.externalId || item.id.slice(0, 8)}</Text>
            <Text style={styles.orderSchedule}>{formatSchedule(item)}</Text>
          </View>
          <View style={styles.badges}>
            {item.status !== 'ASSIGNED' && <StatusBadge status={item.status} size="sm" />}
            {item.urgency === 'URGENT' && (
              <View style={{ marginLeft: item.status !== 'ASSIGNED' ? 4 : 0 }}>
                <UrgencyBadge urgency={item.urgency as Urgency} size="sm" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.customerRow}>
            <Ionicons name="person" size={16} color={colors.gray[500]} />
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName || 'Customer'}
            </Text>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color={colors.gray[500]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.serviceAddress?.city || item.customerAddress || 'No address'}
            </Text>
          </View>

          <View style={styles.serviceRow}>
            <Ionicons name="construct" size={16} color={colors.gray[500]} />
            <Text style={styles.serviceText}>
              {item.serviceType?.replaceAll('_', ' ') || 'Service'}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          {item.lineItems && item.lineItems.length > 0 && (
            <View style={styles.itemsCount}>
              <Ionicons name="cube-outline" size={14} color={colors.gray[500]} />
              <Text style={styles.itemsText}>{item.lineItems.length} items</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const hasFiltersApplied = Boolean(searchQuery) || activeFilter !== 'all';

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color={colors.gray[300]} />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptySubtitle}>{getEmptyMessage()}</Text>
      {hasFiltersApplied && (
        <Button
          title="Clear Filters"
          variant="ghost"
          size="sm"
          onPress={() => {
            setSearchQuery('');
            setActiveFilter('all');
          }}
          style={{ marginTop: spacing.md }}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>{orders.length} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          placeholderTextColor={colors.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterButton, activeFilter === filter.key && styles.activeFilter]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Ionicons
              name={filter.icon}
              size={16}
              color={activeFilter === filter.key ? colors.primary[600] : colors.gray[500]}
            />
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
  },
  clearButton: {
    padding: spacing.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    backgroundColor: colors.gray[100],
  },
  activeFilter: {
    backgroundColor: colors.primary[50],
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  activeFilterText: {
    color: colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  orderCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderInfo: {},
  orderNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
  },
  orderSchedule: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderBody: {
    marginBottom: spacing.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[800],
    marginLeft: spacing.sm,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginLeft: spacing.sm,
    flex: 1,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.sm,
    textTransform: 'capitalize',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  itemsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[700],
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default OrdersListScreen;
