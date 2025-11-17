import React, { useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { ExecutionsStackParamList } from '@navigation/types';
import { useCheckOut } from '@hooks/useCheckInOut';
import { useServiceOrder } from '@hooks/useServiceOrders';
import { useExecutionStore } from '@store/execution.store';
import type { CompletionStatus } from '@types/checkin-checkout.types';

type NavigationProp = NativeStackNavigationProp<ExecutionsStackParamList, 'CheckOut'>;
type CheckOutRouteProp = RouteProp<ExecutionsStackParamList, 'CheckOut'>;

interface Material {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

const CheckOutScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckOutRouteProp>();
  const { serviceOrderId } = route.params;

  const { data: serviceOrder } = useServiceOrder(serviceOrderId);
  const checkOutMutation = useCheckOut();
  const { currentCheckIn } = useExecutionStore();

  // Completion status
  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatus>('COMPLETED');

  // Work summary
  const [workDescription, setWorkDescription] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState<string[]>([]);
  const [newTask, setNewTask] = useState('');
  const [issuesEncountered, setIssuesEncountered] = useState<string[]>([]);
  const [newIssue, setNewIssue] = useState('');
  const [workDuration, setWorkDuration] = useState('');
  const [breakDuration, setBreakDuration] = useState('0');

  // Materials used
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialUnit, setMaterialUnit] = useState('units');
  const [materialNotes, setMaterialNotes] = useState('');

  // Next visit
  const [nextVisitRequired, setNextVisitRequired] = useState(false);
  const [nextVisitReason, setNextVisitReason] = useState('');

  // Customer feedback
  const [customerRating, setCustomerRating] = useState(5);
  const [customerComments, setCustomerComments] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);

  const addTask = () => {
    if (newTask.trim()) {
      setTasksCompleted([...tasksCompleted, newTask.trim()]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    setTasksCompleted(tasksCompleted.filter((_, i) => i !== index));
  };

  const addIssue = () => {
    if (newIssue.trim()) {
      setIssuesEncountered([...issuesEncountered, newIssue.trim()]);
      setNewIssue('');
    }
  };

  const removeIssue = (index: number) => {
    setIssuesEncountered(issuesEncountered.filter((_, i) => i !== index));
  };

  const addMaterial = () => {
    if (!materialName.trim() || !materialQuantity.trim()) {
      Alert.alert('Error', 'Please enter material name and quantity');
      return;
    }

    const newMaterial: Material = {
      id: Date.now().toString(),
      materialId: Date.now().toString(),
      materialName: materialName.trim(),
      quantity: parseFloat(materialQuantity),
      unit: materialUnit,
      notes: materialNotes.trim() || undefined,
    };

    setMaterials([...materials, newMaterial]);
    setMaterialName('');
    setMaterialQuantity('');
    setMaterialNotes('');
    setShowMaterialForm(false);
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter((m) => m.id !== id));
  };

  const handleCheckOut = async () => {
    // Validation
    if (!workDescription.trim()) {
      Alert.alert('Error', 'Please enter a work description');
      return;
    }

    if (tasksCompleted.length === 0) {
      Alert.alert('Error', 'Please add at least one completed task');
      return;
    }

    if (!workDuration.trim() || isNaN(parseFloat(workDuration))) {
      Alert.alert('Error', 'Please enter a valid work duration in minutes');
      return;
    }

    if (nextVisitRequired && !nextVisitReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the next visit');
      return;
    }

    try {
      await checkOutMutation.mutateAsync({
        serviceOrderId,
        completionStatus,
        workPerformed: {
          description: workDescription.trim(),
          tasksCompleted,
          issuesEncountered,
          workDuration: parseFloat(workDuration),
          breakDuration: parseFloat(breakDuration) || 0,
        },
        materialsUsed: materials.map((m) => ({
          materialId: m.materialId,
          materialName: m.materialName,
          quantity: m.quantity,
          unit: m.unit,
          notes: m.notes,
        })),
        nextVisitRequired,
        nextVisitReason: nextVisitRequired ? nextVisitReason.trim() : undefined,
        customerFeedback: {
          rating: customerRating,
          comments: customerComments.trim() || undefined,
          wouldRecommend,
        },
      });

      Alert.alert('Success', 'Checked out successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ExecutionsList'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to check out. Please try again.');
    }
  };

  if (!currentCheckIn) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>No active check-in found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            </View>
          </View>
        )}

        {/* Completion Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Status</Text>
          <View style={styles.card}>
            {(['COMPLETED', 'PARTIALLY_COMPLETED', 'INCOMPLETE'] as CompletionStatus[]).map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    completionStatus === status && styles.statusOptionActive,
                  ]}
                  onPress={() => setCompletionStatus(status)}
                >
                  <View
                    style={[
                      styles.radioButton,
                      completionStatus === status && styles.radioButtonActive,
                    ]}
                  >
                    {completionStatus === status && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.statusOptionText,
                      completionStatus === status && styles.statusOptionTextActive,
                    ]}
                  >
                    {status.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description *</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the work performed..."
              value={workDescription}
              onChangeText={setWorkDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Tasks Completed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks Completed *</Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a completed task..."
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={addTask}
              />
              <TouchableOpacity style={styles.addButton} onPress={addTask}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {tasksCompleted.map((task, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                <Text style={styles.listItemText}>{task}</Text>
                <TouchableOpacity onPress={() => removeTask(index)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Issues Encountered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issues Encountered (Optional)</Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add an issue encountered..."
                value={newIssue}
                onChangeText={setNewIssue}
                onSubmitEditing={addIssue}
              />
              <TouchableOpacity style={styles.addButton} onPress={addIssue}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {issuesEncountered.map((issue, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="alert-circle" size={20} color="#FF9500" />
                <Text style={styles.listItemText}>{issue}</Text>
                <TouchableOpacity onPress={() => removeIssue(index)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Duration *</Text>
          <View style={styles.card}>
            <View style={styles.durationRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Work Time (minutes)</Text>
                <TextInput
                  style={styles.durationInput}
                  placeholder="120"
                  value={workDuration}
                  onChangeText={setWorkDuration}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Break Time (minutes)</Text>
                <TextInput
                  style={styles.durationInput}
                  placeholder="0"
                  value={breakDuration}
                  onChangeText={setBreakDuration}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Materials Used */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Materials Used</Text>
            <TouchableOpacity onPress={() => setShowMaterialForm(!showMaterialForm)}>
              <Ionicons
                name={showMaterialForm ? 'close-circle' : 'add-circle'}
                size={28}
                color="#007AFF"
              />
            </TouchableOpacity>
          </View>

          {showMaterialForm && (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.inputLabel}>Material Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Screws, Paint, Cable"
                value={materialName}
                onChangeText={setMaterialName}
              />

              <View style={styles.durationRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    value={materialQuantity}
                    onChangeText={setMaterialQuantity}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="units"
                    value={materialUnit}
                    onChangeText={setMaterialUnit}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Additional notes..."
                value={materialNotes}
                onChangeText={setMaterialNotes}
              />

              <TouchableOpacity style={styles.addMaterialButton} onPress={addMaterial}>
                <Text style={styles.addMaterialButtonText}>Add Material</Text>
              </TouchableOpacity>
            </View>
          )}

          {materials.length > 0 && (
            <View style={styles.card}>
              {materials.map((material) => (
                <View key={material.id} style={styles.materialItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materialName}>{material.materialName}</Text>
                    <Text style={styles.materialDetails}>
                      {material.quantity} {material.unit}
                    </Text>
                    {material.notes && (
                      <Text style={styles.materialNotes}>{material.notes}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeMaterial(material.id)}>
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Next Visit Required */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Visit</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Next Visit Required</Text>
              <Switch
                value={nextVisitRequired}
                onValueChange={setNextVisitRequired}
                trackColor={{ false: '#D1D1D6', true: '#FF9500' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {nextVisitRequired && (
              <View style={{ marginTop: 12 }}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Reason for next visit..."
                  value={nextVisitReason}
                  onChangeText={setNextVisitReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </View>
        </View>

        {/* Customer Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Feedback</Text>
          <View style={styles.card}>
            <Text style={styles.inputLabel}>Rating</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setCustomerRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= customerRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= customerRating ? '#FFD700' : '#CCCCCC'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Comments (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Customer comments..."
              value={customerComments}
              onChangeText={setCustomerComments}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Would Recommend</Text>
              <Switch
                value={wouldRecommend}
                onValueChange={setWouldRecommend}
                trackColor={{ false: '#D1D1D6', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.checkOutButton,
            checkOutMutation.isPending && styles.buttonDisabled,
          ]}
          onPress={handleCheckOut}
          disabled={checkOutMutation.isPending}
        >
          {checkOutMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="exit-outline" size={24} color="#FFFFFF" />
              <Text style={styles.checkOutButtonText}>Check Out</Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    color: '#333333',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  statusOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonActive: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#666666',
    textTransform: 'capitalize',
  },
  statusOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  addButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationInput: {
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  addMaterialButton: {
    marginTop: 16,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addMaterialButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  materialName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  materialDetails: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  materialNotes: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  starButton: {
    padding: 4,
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
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CheckOutScreen;
