import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore } from '@store/wcf.store';
import { useNavigation } from '@react-navigation/native';

interface WCFStepReviewProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFStepReview: React.FC<WCFStepReviewProps> = ({ onPrevious }) => {
  const navigation = useNavigation();
  const { wcfData, markComplete, resetWCF } = useWCFStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Call API to submit WCF
      // await submitWCF(wcfData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      markComplete();
      Alert.alert('Success', 'Work Closing Form submitted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetWCF();
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit WCF. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExtraCosts = wcfData.extraCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Review & Submit</Text>
          <Text style={styles.subtitle}>
            Review your work closing form before submitting
          </Text>
        </View>

        {/* Step 1: Labor Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time-outline" size={18} /> Labor Summary
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Completion Status:</Text>
              <Text style={styles.value}>{wcfData.completionStatus.replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Work Time:</Text>
              <Text style={styles.value}>
                {wcfData.workDurationMinutes} min ({(wcfData.workDurationMinutes / 60).toFixed(1)}h)
              </Text>
            </View>
            {wcfData.breakDurationMinutes > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Break Time:</Text>
                <Text style={styles.value}>{wcfData.breakDurationMinutes} min</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Tasks Completed:</Text>
              <Text style={styles.value}>{wcfData.tasksCompleted.length}</Text>
            </View>
            {wcfData.workDescription && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Work Description:</Text>
                <Text style={styles.descriptionText}>{wcfData.workDescription}</Text>
              </View>
            )}
            {wcfData.tasksCompleted.length > 0 && (
              <View style={styles.listBox}>
                <Text style={styles.listLabel}>Tasks:</Text>
                {wcfData.tasksCompleted.map((task, index) => (
                  <Text key={index} style={styles.listItem}>
                    • {task}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Step 2: Materials Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="cube-outline" size={18} /> Materials Used
          </Text>
          <View style={styles.card}>
            {wcfData.materials.length > 0 ? (
              <>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{wcfData.materials.length} materials used</Text>
                </View>
                {wcfData.materials.map((material, index) => (
                  <View key={material.id} style={styles.materialItem}>
                    <Text style={styles.materialName}>
                      {index + 1}. {material.materialName}
                    </Text>
                    <Text style={styles.materialQty}>
                      {material.quantity} {material.unit}
                    </Text>
                    {material.notes && <Text style={styles.materialNotes}>{material.notes}</Text>}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No materials recorded</Text>
            )}
          </View>
        </View>

        {/* Step 3: Extra Costs Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="cash-outline" size={18} /> Extra Costs & Changes
          </Text>
          <View style={styles.card}>
            {wcfData.extraCosts.length > 0 ? (
              <>
                <View style={styles.totalCostBox}>
                  <Text style={styles.totalCostLabel}>Total Extra Costs:</Text>
                  <Text style={styles.totalCostValue}>€{totalExtraCosts.toFixed(2)}</Text>
                </View>
                {wcfData.extraCosts.map((cost, index) => (
                  <View key={cost.id} style={styles.costItem}>
                    <Text style={styles.costDescription}>
                      {index + 1}. {cost.description}
                    </Text>
                    <Text style={styles.costAmount}>€{cost.amount.toFixed(2)}</Text>
                    <Text style={styles.costJustification}>{cost.justification}</Text>
                    {cost.requiresApproval && (
                      <View style={styles.approvalBadge}>
                        <Ionicons name="alert-circle-outline" size={12} color="#FF9500" />
                        <Text style={styles.approvalText}>Requires Approval</Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No extra costs recorded</Text>
            )}
            {wcfData.scopeChanges && (
              <View style={styles.scopeBox}>
                <Text style={styles.scopeLabel}>Scope Changes:</Text>
                <Text style={styles.scopeText}>{wcfData.scopeChanges}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Step 4: Issues Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="alert-circle-outline" size={18} /> Issues & Problems
          </Text>
          <View style={styles.card}>
            {wcfData.issues.length > 0 ? (
              <>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{wcfData.issues.length} issues reported</Text>
                </View>
                {wcfData.issues.map((issue, index) => (
                  <View key={issue.id} style={styles.issueItem}>
                    <View style={styles.issueHeader}>
                      <Text style={styles.issueNumber}>{index + 1}.</Text>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(issue.severity) + '20' }]}>
                        <Text style={[styles.severityText, { color: getSeverityColor(issue.severity) }]}>
                          {issue.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.issueDescription}>{issue.description}</Text>
                    {issue.resolution && (
                      <Text style={styles.issueResolution}>
                        <Text style={styles.resolutionLabel}>Resolution: </Text>
                        {issue.resolution}
                      </Text>
                    )}
                    {issue.affectsCompletion && (
                      <View style={styles.warningBadge}>
                        <Ionicons name="warning-outline" size={12} color="#FF9500" />
                        <Text style={styles.warningText}>Affects Completion</Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.emptyText}>No issues reported</Text>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onPrevious} disabled={isSubmitting}>
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.buttonTextSecondary}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSubmit]} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.buttonTextPrimary}>Submit WCF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return '#FF3B30';
    case 'medium':
      return '#FF9500';
    case 'low':
    default:
      return '#34C759';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  headerSection: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333333', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666666' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333333', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  label: { fontSize: 15, color: '#666666' },
  value: { fontSize: 15, fontWeight: '500', color: '#333333' },
  descriptionBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  descriptionLabel: { fontSize: 14, fontWeight: '600', color: '#666666', marginBottom: 6 },
  descriptionText: { fontSize: 15, color: '#333333', lineHeight: 22 },
  listBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  listLabel: { fontSize: 14, fontWeight: '600', color: '#666666', marginBottom: 8 },
  listItem: { fontSize: 14, color: '#333333', paddingVertical: 4, lineHeight: 20 },
  countBadge: { backgroundColor: '#F0F4FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginBottom: 12, alignSelf: 'flex-start' },
  countText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  materialItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  materialName: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 4 },
  materialQty: { fontSize: 14, color: '#666666', marginBottom: 4 },
  materialNotes: { fontSize: 13, color: '#999999', fontStyle: 'italic' },
  totalCostBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F4FF', padding: 12, borderRadius: 8, marginBottom: 16 },
  totalCostLabel: { fontSize: 16, fontWeight: '600', color: '#333333' },
  totalCostValue: { fontSize: 20, fontWeight: 'bold', color: '#34C759' },
  costItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  costDescription: { fontSize: 15, fontWeight: '600', color: '#333333', marginBottom: 4 },
  costAmount: { fontSize: 16, fontWeight: 'bold', color: '#34C759', marginBottom: 4 },
  costJustification: { fontSize: 13, color: '#666666', marginBottom: 4 },
  approvalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 6, backgroundColor: '#FFF3E0', borderRadius: 4, alignSelf: 'flex-start' },
  approvalText: { fontSize: 11, color: '#FF9500', fontWeight: '600' },
  scopeBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  scopeLabel: { fontSize: 14, fontWeight: '600', color: '#666666', marginBottom: 6 },
  scopeText: { fontSize: 14, color: '#333333', lineHeight: 20 },
  issueItem: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  issueNumber: { fontSize: 14, fontWeight: '600', color: '#666666' },
  severityBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  severityText: { fontSize: 11, fontWeight: '700' },
  issueDescription: { fontSize: 14, color: '#333333', marginBottom: 4, lineHeight: 20 },
  issueResolution: { fontSize: 13, color: '#2E7D32', backgroundColor: '#E8F5E9', padding: 8, borderRadius: 6 },
  resolutionLabel: { fontWeight: '600' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 6, backgroundColor: '#FFF3E0', borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  warningText: { fontSize: 11, color: '#FF9500', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#999999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  button: { flex: 1, flexDirection: 'row', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonSubmit: { backgroundColor: '#34C759' },
  buttonSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#007AFF' },
  buttonTextPrimary: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});

export default WCFStepReview;
