import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore } from '@store/wcf.store';

interface WCFStepLaborProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFStepLabor: React.FC<WCFStepLaborProps> = ({ onNext, isFirstStep }) => {
  const {
    wcfData,
    updateLaborData,
    addTask,
    removeTask,
    setCompletionStatus,
  } = useWCFStore();

  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (newTask.trim()) {
      addTask(newTask.trim());
      setNewTask('');
    }
  };

  const handleWorkDurationChange = (text: string) => {
    const minutes = parseInt(text) || 0;
    updateLaborData({ workDurationMinutes: minutes });
  };

  const handleBreakDurationChange = (text: string) => {
    const minutes = parseInt(text) || 0;
    updateLaborData({ breakDurationMinutes: minutes });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Completion Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion Status *</Text>
          <View style={styles.card}>
            {(['COMPLETED', 'PARTIALLY_COMPLETED', 'INCOMPLETE'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  wcfData.completionStatus === status && styles.statusOptionActive,
                ]}
                onPress={() => setCompletionStatus(status)}
              >
                <View
                  style={[
                    styles.radioButton,
                    wcfData.completionStatus === status && styles.radioButtonActive,
                  ]}
                >
                  {wcfData.completionStatus === status && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.statusOptionText,
                    wcfData.completionStatus === status && styles.statusOptionTextActive,
                  ]}
                >
                  {status.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Work Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description *</Text>
          <Text style={styles.sectionHint}>
            Describe the work performed during this service visit
          </Text>
          <View style={styles.card}>
            <TextInput
              style={styles.textArea}
              placeholder="E.g., Installed fiber optic cable, configured router, tested connection..."
              value={wcfData.workDescription}
              onChangeText={(text) => updateLaborData({ workDescription: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Tasks Completed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks Completed *</Text>
          <Text style={styles.sectionHint}>
            Add specific tasks that were completed (minimum 1 required)
          </Text>
          <View style={styles.card}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Add a task..."
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={handleAddTask}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {wcfData.tasksCompleted.length > 0 && (
              <View style={styles.tasksList}>
                {wcfData.tasksCompleted.map((task, index) => (
                  <View key={index} style={styles.taskItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                    <Text style={styles.taskText}>{task}</Text>
                    <TouchableOpacity onPress={() => removeTask(index)}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {wcfData.tasksCompleted.length === 0 && (
              <Text style={styles.emptyText}>No tasks added yet</Text>
            )}
          </View>
        </View>

        {/* Work Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Tracking *</Text>
          <Text style={styles.sectionHint}>
            Enter the time spent on this service (in minutes)
          </Text>
          <View style={styles.card}>
            <View style={styles.durationRow}>
              <View style={styles.durationField}>
                <Text style={styles.inputLabel}>Work Time</Text>
                <View style={styles.durationInputContainer}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="120"
                    value={wcfData.workDurationMinutes > 0 ? wcfData.workDurationMinutes.toString() : ''}
                    onChangeText={handleWorkDurationChange}
                    keyboardType="numeric"
                  />
                  <Text style={styles.durationUnit}>min</Text>
                </View>
                {wcfData.workDurationMinutes > 0 && (
                  <Text style={styles.durationHours}>
                    ({(wcfData.workDurationMinutes / 60).toFixed(1)} hours)
                  </Text>
                )}
              </View>

              <View style={styles.durationField}>
                <Text style={styles.inputLabel}>Break Time</Text>
                <View style={styles.durationInputContainer}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="0"
                    value={wcfData.breakDurationMinutes > 0 ? wcfData.breakDurationMinutes.toString() : ''}
                    onChangeText={handleBreakDurationChange}
                    keyboardType="numeric"
                  />
                  <Text style={styles.durationUnit}>min</Text>
                </View>
              </View>
            </View>

            {wcfData.workDurationMinutes > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Time:</Text>
                <Text style={styles.summaryValue}>
                  {wcfData.workDurationMinutes + wcfData.breakDurationMinutes} minutes
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Helper Text */}
        <View style={styles.helpSection}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.helpText}>
            Fields marked with * are required to proceed to the next step
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonNext]}
          onPress={onNext}
        >
          <Text style={styles.buttonText}>Next: Materials</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: '#666666',
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
    minHeight: 120,
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
  tasksList: {
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationField: {
    flex: 1,
  },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  durationInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 12,
  },
  durationUnit: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  durationHours: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonNext: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WCFStepLabor;
