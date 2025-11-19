import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore, WCFExtraCost } from '@store/wcf.store';

interface WCFStepExtrasProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFStepExtras: React.FC<WCFStepExtrasProps> = ({ onNext, onPrevious }) => {
  const { wcfData, addExtraCost, removeExtraCost, updateLaborData } = useWCFStore();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);

  const handleAddCost = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!justification.trim()) {
      Alert.alert('Error', 'Please enter a justification');
      return;
    }

    const newCost: WCFExtraCost = {
      id: Date.now().toString(),
      description: description.trim(),
      amount: parseFloat(amount),
      requiresApproval,
      justification: justification.trim(),
    };

    addExtraCost(newCost);

    // Reset form
    setDescription('');
    setAmount('');
    setJustification('');
    setRequiresApproval(true);
    setShowForm(false);
  };

  const handleDeleteCost = (id: string) => {
    Alert.alert(
      'Delete Extra Cost',
      'Are you sure you want to remove this extra cost?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeExtraCost(id) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Extra Costs & Changes</Text>
          <Text style={styles.subtitle}>
            Record any additional costs or scope changes requiring approval
          </Text>
        </View>

        {/* Extra Costs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cash-outline" size={18} /> Extra Costs
            </Text>
            {!showForm && (
              <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Cost</Text>
              </TouchableOpacity>
            )}
          </View>

          {showForm && (
            <View style={styles.form}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="E.g., Additional parts needed"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.label}>Amount (€) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Justification *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explain why this extra cost is necessary"
                value={justification}
                onChangeText={setJustification}
                multiline
                numberOfLines={3}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Requires Approval</Text>
                <Switch value={requiresApproval} onValueChange={setRequiresApproval} />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.formButton, styles.cancelButton]}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAddCost} style={[styles.formButton, styles.saveButton]}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Add Cost</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Costs List */}
          <View style={styles.card}>
            {wcfData.extraCosts.length > 0 ? (
              wcfData.extraCosts.map((cost) => (
                <View key={cost.id} style={styles.costItem}>
                  <View style={styles.costHeader}>
                    <Text style={styles.costDescription}>{cost.description}</Text>
                    <TouchableOpacity onPress={() => handleDeleteCost(cost.id)}>
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.costAmount}>€{cost.amount.toFixed(2)}</Text>
                  <Text style={styles.costJustification}>{cost.justification}</Text>
                  {cost.requiresApproval && (
                    <View style={styles.approvalBadge}>
                      <Ionicons name="alert-circle-outline" size={14} color="#FF9500" />
                      <Text style={styles.approvalText}>Requires Approval</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No extra costs recorded</Text>
            )}
          </View>
        </View>

        {/* Scope Changes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text-outline" size={18} /> Scope Changes
          </Text>
          <Text style={styles.hint}>
            Describe any changes to the original work scope
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="E.g., Customer requested additional work..."
            value={wcfData.scopeChanges || ''}
            onChangeText={(text) => updateLaborData({ scopeChanges: text } as any)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onPrevious}>
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.buttonTextSecondary}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onNext}>
          <Text style={styles.buttonTextPrimary}>Next: Issues</Text>
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
  hint: { fontSize: 13, color: '#666666', marginBottom: 8, fontStyle: 'italic' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formButtons: { flexDirection: 'row', gap: 12 },
  formButton: { flex: 1, flexDirection: 'row', height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 },
  saveButton: { backgroundColor: '#34C759' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  cancelButtonText: { color: '#666666', fontSize: 16, fontWeight: '600' },
  costItem: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  costHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  costDescription: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333333', marginRight: 8 },
  costAmount: { fontSize: 20, fontWeight: 'bold', color: '#34C759', marginBottom: 8 },
  costJustification: { fontSize: 14, color: '#666666', marginBottom: 8 },
  approvalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#FFF3E0', borderRadius: 4, alignSelf: 'flex-start' },
  approvalText: { fontSize: 12, color: '#FF9500', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#999999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  button: { flex: 1, flexDirection: 'row', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#007AFF' },
  buttonTextPrimary: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});

export default WCFStepExtras;
