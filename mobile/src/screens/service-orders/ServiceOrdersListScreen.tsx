import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
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

const ServiceOrdersListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isLoading, refetch } = useAssignedServiceOrders();
  const { getFilteredOrders, filters, setFilters } = useServiceOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  const orders = getFilteredOrders();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setFilters({ ...filters, searchQuery: query });
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('ServiceOrderDetail', { orderId });
  };

  const renderOrderItem = ({ item }: { item: ServiceOrder }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => handleOrderPress(item.id)}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>{item.orderNumber}</Text>
        <View style={[styles.statusBadge, getStatusColor(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.customer.firstName} {item.customer.lastName}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.siteAddress.city}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.scheduledDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(item.scheduledTimeSlot.start).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.serviceType}>{item.serviceType}</Text>
        {item.priority === 'P1' && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>Priority</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={filters.searchQuery || ''}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>No service orders assigned</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ASSIGNED':
      return { backgroundColor: '#FFE5B4' };
    case 'ACCEPTED':
      return { backgroundColor: '#B4E5FF' };
    case 'IN_PROGRESS':
      return { backgroundColor: '#FFD700' };
    case 'COMPLETED':
      return { backgroundColor: '#90EE90' };
    default:
      return { backgroundColor: '#E0E0E0' };
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  orderInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  serviceType: {
    fontSize: 12,
    color: '#999999',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
  },
});

export default ServiceOrdersListScreen;
