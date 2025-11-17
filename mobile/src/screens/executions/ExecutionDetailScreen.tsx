import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ExecutionsStackParamList } from '@navigation/types';
import { useServiceOrder } from '@hooks/useServiceOrders';
import { useExecutionStore } from '@store/execution.store';

type ExecutionDetailRouteProp = RouteProp<ExecutionsStackParamList, 'ExecutionDetail'>;
type NavigationProp = NativeStackNavigationProp<ExecutionsStackParamList, 'ExecutionDetail'>;

const ExecutionDetailScreen: React.FC = () => {
  const route = useRoute<ExecutionDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { serviceOrderId } = route.params;

  const { data: serviceOrder } = useServiceOrder(serviceOrderId);
  const { currentCheckIn, currentCheckOut, photos, isOnSite } = useExecutionStore();

  if (!serviceOrder) {
    return (
      <View style={styles.centerContainer}>
        <Text>Service order not found</Text>
      </View>
    );
  }

  const handleCapturePhoto = (type: 'arrival' | 'work' | 'completion') => {
    navigation.navigate('MediaCapture', { serviceOrderId, type });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Service Order Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>{serviceOrder.orderNumber}</Text>
          <View style={[styles.statusBadge, getStatusColor(serviceOrder.status)]}>
            <Text style={styles.statusText}>{serviceOrder.status}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <Text style={styles.customerName}>
              {serviceOrder.customer.firstName} {serviceOrder.customer.lastName}
            </Text>
            <Text style={styles.infoText}>{serviceOrder.customer.phone}</Text>
          </View>
        </View>

        {/* Check-In Status */}
        {isOnSite && currentCheckIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-In Status</Text>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Checked In</Text>
                  <Text style={styles.statusTime}>
                    {new Date(currentCheckIn.checkInTime).toLocaleTimeString()}
                  </Text>
                </View>
              </View>

              {currentCheckIn.safetyHazards.length > 0 && (
                <View style={styles.hazardsContainer}>
                  <Text style={styles.hazardsTitle}>Safety Hazards Reported:</Text>
                  {currentCheckIn.safetyHazards.map((hazard, index) => (
                    <View key={index} style={styles.hazardItem}>
                      <Ionicons name="alert-circle" size={16} color="#FF9500" />
                      <Text style={styles.hazardText}>
                        {hazard.type} ({hazard.severity})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Photos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <TouchableOpacity onPress={() => handleCapturePhoto('work')}>
              <Ionicons name="camera" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal style={styles.photosScroll}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <View style={styles.photoTypeBadge}>
                  <Text style={styles.photoTypeText}>{photo.type}</Text>
                </View>
                {!photo.uploaded && (
                  <View style={styles.uploadBadge}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={() => handleCapturePhoto('work')}
            >
              <Ionicons name="add" size={32} color="#007AFF" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Work Summary (if checked out) */}
        {currentCheckOut && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Summary</Text>
            <View style={styles.card}>
              <Text style={styles.workDescription}>
                {currentCheckOut.workPerformed.description}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.subsectionTitle}>Tasks Completed</Text>
              {currentCheckOut.workPerformed.tasksCompleted.map((task, index) => (
                <View key={index} style={styles.taskItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.taskText}>{task}</Text>
                </View>
              ))}

              {currentCheckOut.workPerformed.issuesEncountered.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.subsectionTitle}>Issues Encountered</Text>
                  {currentCheckOut.workPerformed.issuesEncountered.map((issue, index) => (
                    <View key={index} style={styles.issueItem}>
                      <Ionicons name="alert-circle" size={16} color="#FF9500" />
                      <Text style={styles.issueText}>{issue}</Text>
                    </View>
                  ))}
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.durationRow}>
                <View>
                  <Text style={styles.durationLabel}>Work Time</Text>
                  <Text style={styles.durationValue}>
                    {currentCheckOut.workPerformed.workDuration} min
                  </Text>
                </View>
                <View>
                  <Text style={styles.durationLabel}>Break Time</Text>
                  <Text style={styles.durationValue}>
                    {currentCheckOut.workPerformed.breakDuration} min
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Materials Used */}
        {currentCheckOut && currentCheckOut.materialsUsed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials Used</Text>
            <View style={styles.card}>
              {currentCheckOut.materialsUsed.map((material, index) => (
                <View key={index} style={styles.materialItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materialName}>{material.materialName}</Text>
                    <Text style={styles.materialDetails}>
                      {material.quantity} {material.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Customer Feedback */}
        {currentCheckOut?.customerFeedback && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Feedback</Text>
            <View style={styles.card}>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= currentCheckOut.customerFeedback!.rating ? 'star' : 'star-outline'
                    }
                    size={24}
                    color={
                      star <= currentCheckOut.customerFeedback!.rating ? '#FFD700' : '#CCCCCC'
                    }
                  />
                ))}
              </View>
              {currentCheckOut.customerFeedback.comments && (
                <Text style={styles.feedbackComments}>
                  {currentCheckOut.customerFeedback.comments}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {isOnSite && !currentCheckOut && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.checkOutButton}
            onPress={() => navigation.navigate('CheckOut', { serviceOrderId })}
          >
            <Ionicons name="exit-outline" size={24} color="#FFFFFF" />
            <Text style={styles.checkOutButtonText}>Check Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
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
    color: '#007AFF',
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
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  statusTime: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  hazardsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  hazardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  hazardText: {
    fontSize: 14,
    color: '#666666',
  },
  photosScroll: {
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: 12,
    position: 'relative',
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  photoTypeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  uploadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF9500',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  workDescription: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  taskText: {
    fontSize: 14,
    color: '#666666',
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  issueText: {
    fontSize: 14,
    color: '#666666',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  durationLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  materialItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  materialName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  materialDetails: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackComments: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkOutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  checkOutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ExecutionDetailScreen;
