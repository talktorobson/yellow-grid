import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore, WCFIssue } from '@store/wcf.store';

interface WCFStepIssuesProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFStepIssues: React.FC<WCFStepIssuesProps> = ({ onNext, onPrevious }) => {
  const { wcfData, addIssue, removeIssue } = useWCFStore();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [resolution, setResolution] = useState('');
  const [affectsCompletion, setAffectsCompletion] = useState(false);

  const handleAddIssue = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const newIssue: WCFIssue = {
      id: Date.now().toString(),
      description: description.trim(),
      severity,
      resolution: resolution.trim() || undefined,
      affectsCompletion,
    };

    addIssue(newIssue);

    // Reset form
    setDescription('');
    setSeverity('low');
    setResolution('');
    setAffectsCompletion(false);
    setShowForm(false);
  };

  const handleDeleteIssue = (id: string) => {
    Alert.alert(
      'Delete Issue',
      'Are you sure you want to remove this issue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeIssue(id) },
      ]
    );
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
      default:
        return '#34C759';
    }
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'high':
        return 'alert-circle';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'information-circle';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Issues & Problems</Text>
          <Text style={styles.subtitle}>
            Record any issues or problems encountered during service
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="alert-circle-outline" size={18} /> Issues Encountered
            </Text>
            {!showForm && (
              <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Issue</Text>
              </TouchableOpacity>
            )}
          </View>

          {showForm && (
            <View style={styles.form}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the issue or problem..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Severity *</Text>
              <View style={styles.severityButtons}>
                <TouchableOpacity
                  style={[styles.severityButton, severity === 'low' && styles.severityButtonActive]}
                  onPress={() => setSeverity('low')}
                >
                  <Ionicons name="information-circle" size={20} color={severity === 'low' ? '#FFFFFF' : '#34C759'} />
                  <Text style={[styles.severityButtonText, severity === 'low' && styles.severityButtonTextActive]}>
                    Low
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.severityButton, severity === 'medium' && styles.severityButtonActive]}
                  onPress={() => setSeverity('medium')}
                >
                  <Ionicons name="warning" size={20} color={severity === 'medium' ? '#FFFFFF' : '#FF9500'} />
                  <Text style={[styles.severityButtonText, severity === 'medium' && styles.severityButtonTextActive]}>
                    Medium
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.severityButton, severity === 'high' && styles.severityButtonActive]}
                  onPress={() => setSeverity('high')}
                >
                  <Ionicons name="alert-circle" size={20} color={severity === 'high' ? '#FFFFFF' : '#FF3B30'} />
                  <Text style={[styles.severityButtonText, severity === 'high' && styles.severityButtonTextActive]}>
                    High
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Resolution (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="How was this issue resolved..."
                value={resolution}
                onChangeText={setResolution}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAffectsCompletion(!affectsCompletion)}
              >
                <Ionicons
                  name={affectsCompletion ? 'checkbox' : 'square-outline'}
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.checkboxLabel}>This issue affects job completion</Text>
              </TouchableOpacity>

              <View style={styles.formButtons}>
                <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.formButton, styles.cancelButton]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddIssue} style={[styles.formButton, styles.saveButton]}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Add Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Issues List */}
          <View style={styles.card}>
            {wcfData.issues.length > 0 ? (
              wcfData.issues.map((issue) => (
                <View key={issue.id} style={styles.issueItem}>
                  <View style={styles.issueHeader}>
                    <View style={styles.issueHeaderLeft}>
                      <Ionicons
                        name={getSeverityIcon(issue.severity)}
                        size={24}
                        color={getSeverityColor(issue.severity)}
                      />
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) + '20' }]}>
                        <Text style={[styles.severityBadgeText, { color: getSeverityColor(issue.severity) }]}>
                          {issue.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteIssue(issue.id)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.issueDescription}>{issue.description}</Text>
                  {issue.resolution && (
                    <View style={styles.resolutionBox}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#34C759" />
                      <Text style={styles.resolutionText}>{issue.resolution}</Text>
                    </View>
                  )}
                  {issue.affectsCompletion && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="warning-outline" size={14} color="#FF9500" />
                      <Text style={styles.warningText}>Affects Completion</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No issues recorded</Text>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onPrevious}>
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.buttonTextSecondary}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onNext}>
          <Text style={styles.buttonTextPrimary}>Next: Review</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  headerSection: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333333', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666' },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333333', marginBottom: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  form: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  severityButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  severityButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FFFFFF' },
  severityButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  severityButtonText: { fontSize: 14, fontWeight: '600', color: '#333333' },
  severityButtonTextActive: { color: '#FFFFFF' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  checkboxLabel: { fontSize: 15, color: '#333333' },
  formButtons: { flexDirection: 'row', gap: 12 },
  formButton: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 },
  saveButton: { backgroundColor: '#34C759' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  cancelButtonText: { color: '#666666', fontSize: 16, fontWeight: '600' },
  issueItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  issueHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  severityBadgeText: { fontSize: 12, fontWeight: '700' },
  issueDescription: { fontSize: 15, color: '#333333', marginBottom: 8, lineHeight: 22 },
  resolutionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E8F5E9', borderRadius: 8, marginBottom: 8 },
  resolutionText: { flex: 1, fontSize: 14, color: '#2E7D32', lineHeight: 20 },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFF3E0', borderRadius: 4, alignSelf: 'flex-start' },
  warningText: { fontSize: 12, color: '#FF9500', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#999999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  button: { flex: 1, flexDirection: 'row', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#007AFF' },
  buttonTextPrimary: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});

export default WCFStepIssues;
