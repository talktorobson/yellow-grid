import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ExecutionsStackParamList } from '@navigation/types';
import { useCheckIn } from '@hooks/useCheckInOut';
import { useServiceOrder } from '@hooks/useServiceOrders';
import type { GeoLocation } from '@types/service-order.types';
import type { CheckInMethod, SafetyHazard, HazardType } from '@types/checkin-checkout.types';

type NavigationProp = NativeStackNavigationProp<ExecutionsStackParamList, 'CheckIn'>;
type CheckInRouteProp = RouteProp<ExecutionsStackParamList, 'CheckIn'>;

const CheckInScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckInRouteProp>();
  const { serviceOrderId } = route.params;

  const { data: serviceOrder } = useServiceOrder(serviceOrderId);
  const checkInMutation = useCheckIn();

  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [customerPresent, setCustomerPresent] = useState(true);
  const [siteAccessNotes, setSiteAccessNotes] = useState('');
  const [safetyHazards, setSafetyHazards] = useState<SafetyHazard[]>([]);
  const [checkInMethod] = useState<CheckInMethod>(CheckInMethod.GPS_AUTO);

  // New hazard form
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [hazardType, setHazardType] = useState<HazardType>(HazardType.ELECTRICAL);
  const [hazardDescription, setHazardDescription] = useState('');
  const [hazardSeverity, setHazardSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>(
    'MEDIUM'
  );

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission not granted');
        setLocationLoading(false);
        return;
      }

      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentLocation: GeoLocation = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        altitude: locationResult.coords.altitude ?? undefined,
        accuracy: locationResult.coords.accuracy ?? 0,
        timestamp: new Date(locationResult.timestamp).toISOString(),
      };

      setLocation(currentLocation);
      setLocationError(null);
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const addSafetyHazard = () => {
    if (!hazardDescription.trim()) {
      Alert.alert('Error', 'Please enter a hazard description');
      return;
    }

    const newHazard: SafetyHazard = {
      type: hazardType,
      description: hazardDescription,
      severity: hazardSeverity,
      mitigationActions: [],
      reportedAt: new Date().toISOString(),
    };

    setSafetyHazards([...safetyHazards, newHazard]);
    setHazardDescription('');
    setShowHazardForm(false);
  };

  const removeSafetyHazard = (index: number) => {
    setSafetyHazards(safetyHazards.filter((_, i) => i !== index));
  };

  const handleCheckIn = async () => {
    if (!location) {
      Alert.alert('Error', 'Location is required for check-in');
      return;
    }

    if (location.accuracy > 100) {
      Alert.alert(
        'Low Accuracy',
        'Your GPS accuracy is low. This may affect location verification. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: performCheckIn },
        ]
      );
    } else {
      await performCheckIn();
    }
  };

  const performCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync({
        serviceOrderId,
        checkInMethod,
        customerPresent,
        siteAccessNotes: siteAccessNotes.trim() || undefined,
        safetyHazards,
      });

      Alert.alert('Success', 'Checked in successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to check in. Please try again.');
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return '#34C759';
    if (accuracy <= 30) return '#FFD700';
    if (accuracy <= 100) return '#FF9500';
    return '#FF3B30';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return '#34C759';
      case 'MEDIUM':
        return '#FFD700';
      case 'HIGH':
        return '#FF9500';
      case 'CRITICAL':
        return '#FF3B30';
      default:
        return '#999999';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Service Order Info */}
        {serviceOrder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Order</Text>
            <View style={styles.card}>
              <Text style={styles.orderNumber}>{serviceOrder.orderNumber}</Text>
              <Text style={styles.customerName}>
                {serviceOrder.customer.firstName} {serviceOrder.customer.lastName}
              </Text>
              <View style={styles.addressRow}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.addressText}>
                  {serviceOrder.siteAddress.street}, {serviceOrder.siteAddress.city}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* GPS Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>GPS Location</Text>
            <TouchableOpacity onPress={getCurrentLocation} disabled={locationLoading}>
              <Ionicons
                name="refresh"
                size={24}
                color={locationLoading ? '#CCCCCC' : '#007AFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {locationLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#007AFF" />
                <Text style={styles.loadingText}>Getting your location...</Text>
              </View>
            ) : locationError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                <Text style={styles.errorText}>{locationError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={getCurrentLocation}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : location ? (
              <>
                <View style={styles.locationRow}>
                  <Ionicons name="navigate" size={20} color="#007AFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabel}>Coordinates</Text>
                    <Text style={styles.locationValue}>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.locationRow}>
                  <Ionicons name="locate" size={20} color="#007AFF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationLabel}>Accuracy</Text>
                    <Text
                      style={[
                        styles.locationValue,
                        { color: getAccuracyColor(location.accuracy) },
                      ]}
                    >
                      ±{location.accuracy.toFixed(0)} meters
                    </Text>
                  </View>
                </View>

                {location.altitude && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.locationRow}>
                      <Ionicons name="arrow-up" size={20} color="#007AFF" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.locationLabel}>Altitude</Text>
                        <Text style={styles.locationValue}>
                          {location.altitude.toFixed(0)} meters
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </>
            ) : null}
          </View>
        </View>

        {/* Customer Presence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Customer Present</Text>
                <Text style={styles.switchDescription}>
                  Is the customer on-site?
                </Text>
              </View>
              <Switch
                value={customerPresent}
                onValueChange={setCustomerPresent}
                trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Site Access Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Access Notes (Optional)</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textArea}
              placeholder="Enter any access notes (e.g., gate code, parking instructions)"
              value={siteAccessNotes}
              onChangeText={setSiteAccessNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Safety Hazards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Safety Hazards</Text>
            <TouchableOpacity onPress={() => setShowHazardForm(!showHazardForm)}>
              <Ionicons
                name={showHazardForm ? 'close-circle' : 'add-circle'}
                size={28}
                color="#007AFF"
              />
            </TouchableOpacity>
          </View>

          {showHazardForm && (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.formLabel}>Hazard Type</Text>
              <View style={styles.hazardTypeGrid}>
                {Object.values(HazardType).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.hazardTypeChip,
                      hazardType === type && styles.hazardTypeChipActive,
                    ]}
                    onPress={() => setHazardType(type)}
                  >
                    <Text
                      style={[
                        styles.hazardTypeText,
                        hazardType === type && styles.hazardTypeTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Severity</Text>
              <View style={styles.severityRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityButton,
                      hazardSeverity === severity && {
                        backgroundColor: getSeverityColor(severity),
                      },
                    ]}
                    onPress={() => setHazardSeverity(severity)}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        hazardSeverity === severity && styles.severityTextActive,
                      ]}
                    >
                      {severity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the safety hazard..."
                value={hazardDescription}
                onChangeText={setHazardDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.addHazardButton} onPress={addSafetyHazard}>
                <Text style={styles.addHazardButtonText}>Add Hazard</Text>
              </TouchableOpacity>
            </View>
          )}

          {safetyHazards.length > 0 && (
            <View style={styles.card}>
              {safetyHazards.map((hazard, index) => (
                <View key={index} style={styles.hazardItem}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.hazardHeader}>
                      <Text style={styles.hazardType}>{hazard.type}</Text>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityColor(hazard.severity) },
                        ]}
                      >
                        <Text style={styles.severityBadgeText}>{hazard.severity}</Text>
                      </View>
                    </View>
                    <Text style={styles.hazardDescription}>{hazard.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSafetyHazard(index)}>
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.checkInButton, (!location || checkInMutation.isPending) && styles.buttonDisabled]}
          onPress={handleCheckIn}
          disabled={!location || checkInMutation.isPending}
        >
          {checkInMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.checkInButtonText}>Check In</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingTop: 8,
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
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  textArea: {
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  hazardTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hazardTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  hazardTypeChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  hazardTypeText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  hazardTypeTextActive: {
    color: '#FFFFFF',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  severityTextActive: {
    color: '#FFFFFF',
  },
  addHazardButton: {
    marginTop: 16,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addHazardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  hazardType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hazardDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  checkInButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default CheckInScreen;
