import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ServiceOrdersStackScreenProps } from '@navigation/types';
import { useServiceOrder, useAcceptAssignment } from '@hooks/useServiceOrders';
import { useCheckIn } from '@hooks/useCheckInOut';

type Props = ServiceOrdersStackScreenProps<'ServiceOrderDetail'>;

const ServiceOrderDetailScreen: React.FC<Props> = ({ route }) => {
  const { orderId } = route.params;
  const { data: order, isLoading } = useServiceOrder(orderId);
  const acceptAssignment = useAcceptAssignment();
  const checkInMutation = useCheckIn();

  const handleCallCustomer = () => {
    if (order?.customer.phone) {
      Linking.openURL(`tel:${order.customer.phone}`);
    }
  };

  const handleNavigate = () => {
    if (order?.siteAddress.coordinates) {
      const { latitude, longitude } = order.siteAddress.coordinates;
      const url = Platform.OS === 'ios'
        ? `maps://app?daddr=${latitude},${longitude}`
        : `google.navigation:q=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };

  const handleAcceptAssignment = async () => {
    Alert.alert(
      'Accept Assignment',
      'Do you want to accept this service order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptAssignment.mutateAsync(orderId);
              Alert.alert('Success', 'Assignment accepted');
            } catch (error) {
              Alert.alert('Error', 'Failed to accept assignment');
            }
          },
        },
      ]
    );
  };

  const handleCheckIn = async () => {
    Alert.alert(
      'Check In',
      'Are you ready to check in for this service order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check In',
          onPress: async () => {
            try {
              await checkInMutation.mutateAsync({
                serviceOrderId: orderId,
                customerPresent: true,
              });
              Alert.alert('Success', 'Checked in successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to check in');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text>Service order not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={[styles.statusBadge, getStatusColor(order.status)]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                {order.customer.firstName} {order.customer.lastName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{order.customer.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{order.customer.phone}</Text>
              <TouchableOpacity onPress={handleCallCustomer} style={styles.callButton}>
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Site Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Address</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoText}>{order.siteAddress.street}</Text>
                <Text style={styles.infoText}>
                  {order.siteAddress.city}, {order.siteAddress.postalCode}
                </Text>
                <Text style={styles.infoText}>{order.siteAddress.country}</Text>
              </View>
            </View>
            {order.siteAddress.coordinates && (
              <TouchableOpacity onPress={handleNavigate} style={styles.navigateButton}>
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
                <Text style={styles.navigateButtonText}>Navigate</Text>
              </TouchableOpacity>
            )}
            {order.siteAddress.accessInstructions && (
              <View style={styles.accessInstructions}>
                <Text style={styles.accessTitle}>Access Instructions:</Text>
                <Text style={styles.accessText}>{order.siteAddress.accessInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                {new Date(order.scheduledDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                {new Date(order.scheduledTimeSlot.start).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' - '}
                {new Date(order.scheduledTimeSlot.end).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="hourglass" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                Estimated duration: {order.estimatedDuration} minutes
              </Text>
            </View>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="construct" size={20} color="#007AFF" />
              <Text style={styles.infoText}>{order.serviceType}</Text>
            </View>
            {order.priority === 'P1' && (
              <View style={styles.infoRow}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={[styles.infoText, { color: '#FF3B30', fontWeight: '600' }]}>
                  Priority Service
                </Text>
              </View>
            )}
            <Text style={styles.descriptionText}>{order.serviceDescription}</Text>
            {order.specialInstructions && (
              <View style={styles.specialInstructions}>
                <Text style={styles.specialTitle}>Special Instructions:</Text>
                <Text style={styles.specialText}>{order.specialInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Products */}
        {order.products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products</Text>
            <View style={styles.infoCard}>
              {order.products.map((product, index) => (
                <View key={product.id} style={styles.productRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDetails}>
                      SKU: {product.sku} | Qty: {product.quantity}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>
                    ${product.unitPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {order.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAcceptAssignment}
            disabled={acceptAssignment.isPending}
          >
            {acceptAssignment.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Accept Assignment</Text>
            )}
          </TouchableOpacity>
        )}

        {order.status === 'ACCEPTED' && !order.checkInId && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckIn}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Check In</Text>
            )}
          </TouchableOpacity>
        )}

        {order.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              /* Navigate to execution screen */
            }}
          >
            <Text style={styles.secondaryButtonText}>Continue Work</Text>
          </TouchableOpacity>
        )}
      </View>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  callButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accessInstructions: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  accessText: {
    fontSize: 14,
    color: '#666666',
  },
  descriptionText: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 22,
  },
  specialInstructions: {
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  specialTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  specialText: {
    fontSize: 14,
    color: '#666666',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  productDetails: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ServiceOrderDetailScreen;
