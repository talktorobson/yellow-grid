import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServiceOrdersStackParamList } from '@navigation/types';
import { useAssignedServiceOrders } from '@hooks/useServiceOrders';
import { useServiceOrderStore } from '@store/service-order.store';
import type { ServiceOrder } from '@types/service-order.types';

type NavigationProp = NativeStackNavigationProp<ServiceOrdersStackParamList, 'ServiceOrdersList'>;

type FilterType = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'ISSUE';

interface DayGroup {
  date: Date;
  dateString: string;
  dayName: string;
  orders: ServiceOrder[];
  isToday: boolean;
}

const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isLoading, refetch } = useAssignedServiceOrders();
  const { getFilteredOrders } = useServiceOrderStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const allOrders = getFilteredOrders();

  // Generate 7-day date range (today + 6 days)
  const dateRange = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }

    return days;
  }, []);

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups: DayGroup[] = dateRange.map((date) => {
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();

      // Filter orders for this date
      let dayOrders = allOrders.filter((order) => {
        const orderDate = new Date(order.scheduledDate);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === date.getTime();
      });

      // Apply status filter
      if (activeFilter !== 'ALL') {
        dayOrders = dayOrders.filter((order) => {
          switch (activeFilter) {
            case 'SCHEDULED':
              return ['ASSIGNED', 'ACCEPTED', 'SCHEDULED'].includes(order.status);
            case 'COMPLETED':
              return order.status === 'COMPLETED';
            case 'ISSUE':
              return order.status === 'ISSUE' || order.hasIssues;
            default:
              return true;
          }
        });
      }

      return { date, dateString, dayName, orders: dayOrders, isToday };
    });

    return groups;
  }, [dateRange, allOrders, activeFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('ServiceOrderDetail', { orderId });
  };

  const renderFilterButton = (filter: FilterType, label: string, icon: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setActiveFilter(filter)}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={isActive ? '#FFFFFF' : '#666666'}
        />
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderServiceOrder = (order: ServiceOrder) => {
    const statusColor = getStatusColor(order.status);

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.orderCard}
        onPress={() => handleOrderPress(order.id)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderLeft}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderTime}>
              {new Date(order.scheduledTimeSlot.start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.infoText}>
              {order.customer.firstName} {order.customer.lastName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{order.siteAddress.city}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="construct-outline" size={14} color="#666" />
            <Text style={styles.infoText}>{order.serviceType}</Text>
          </View>
        </View>

        {order.priority === 'P1' && (
          <View style={styles.priorityBadge}>
            <Ionicons name="flash" size={12} color="#FFFFFF" />
            <Text style={styles.priorityText}>Priority</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDaySection = (group: DayGroup) => {
    return (
      <View key={group.dateString} style={styles.daySection}>
        <View style={[styles.dayHeader, group.isToday && styles.dayHeaderToday]}>
          <View style={styles.dayHeaderLeft}>
            <Text style={[styles.dayName, group.isToday && styles.dayNameToday]}>
              {group.isToday ? 'Today' : group.dayName}
            </Text>
            <Text style={[styles.dayDate, group.isToday && styles.dayDateToday]}>
              {group.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <View style={[styles.countBadge, group.isToday && styles.countBadgeToday]}>
            <Text style={[styles.countText, group.isToday && styles.countTextToday]}>
              {group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'}
            </Text>
          </View>
        </View>

        {group.orders.length > 0 ? (
          <View style={styles.ordersContainer}>
            {group.orders.map((order) => renderServiceOrder(order))}
          </View>
        ) : (
          <View style={styles.emptyDay}>
            <Ionicons name="calendar-outline" size={32} color="#CCCCCC" />
            <Text style={styles.emptyText}>No orders scheduled</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && allOrders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSubtitle}>Next 7 days</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {renderFilterButton('ALL', 'All', 'grid-outline')}
          {renderFilterButton('SCHEDULED', 'Scheduled', 'time-outline')}
          {renderFilterButton('COMPLETED', 'Completed', 'checkmark-circle-outline')}
          {renderFilterButton('ISSUE', 'Issues', 'alert-circle-outline')}
        </ScrollView>
      </View>

      {/* Schedule List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {groupedOrders.map((group) => renderDaySection(group))}
      </ScrollView>
    </SafeAreaView>
  );
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SCHEDULED':
    case 'ASSIGNED':
      return '#FFE5B4';
    case 'ACCEPTED':
      return '#B4E5FF';
    case 'IN_PROGRESS':
      return '#FFD700';
    case 'COMPLETED':
      return '#90EE90';
    case 'ISSUE':
      return '#FFB4B4';
    default:
      return '#E0E0E0';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayHeaderToday: {
    backgroundColor: '#007AFF',
  },
  dayHeaderLeft: {
    gap: 4,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  dayNameToday: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 13,
    color: '#666666',
  },
  dayDateToday: {
    color: '#E5F2FF',
  },
  countBadge: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  countTextToday: {
    color: '#FFFFFF',
  },
  ordersContainer: {
    gap: 8,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  orderTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333333',
  },
  orderInfo: {
    gap: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyDay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
});

export default ScheduleScreen;
