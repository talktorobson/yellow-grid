import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore, type WCFMaterial } from '@store/wcf.store';

interface WCFStepMaterialsProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFStepMaterials: React.FC<WCFStepMaterialsProps> = ({
  onNext,
  onPrevious,
}) => {
  const { wcfData, addMaterial, removeMaterial } = useWCFStore();

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialUnit, setMaterialUnit] = useState('units');
  const [materialNotes, setMaterialNotes] = useState('');

  const handleAddMaterial = () => {
    if (!materialName.trim() || !materialQuantity.trim()) {
      Alert.alert('Error', 'Please enter material name and quantity');
      return;
    }

    const quantity = parseFloat(materialQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const newMaterial: WCFMaterial = {
      id: Date.now().toString(),
      materialId: Date.now().toString(),
      materialName: materialName.trim(),
      quantity,
      unit: materialUnit.trim() || 'units',
      notes: materialNotes.trim() || undefined,
    };

    addMaterial(newMaterial);

    // Reset form
    setMaterialName('');
    setMaterialQuantity('');
    setMaterialUnit('units');
    setMaterialNotes('');
    setShowMaterialForm(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Materials Used</Text>
          <Text style={styles.subtitle}>
            Record all materials and parts used during this service visit
          </Text>
        </View>

        {/* Add Material Button */}
        <View style={styles.section}>
          {!showMaterialForm && (
            <TouchableOpacity
              style={styles.addMaterialButton}
              onPress={() => setShowMaterialForm(true)}
            >
              <Ionicons name="add-circle" size={24} color="#007AFF" />
              <Text style={styles.addMaterialButtonText}>Add Material</Text>
            </TouchableOpacity>
          )}

          {/* Add Material Form */}
          {showMaterialForm && (
            <View style={styles.card}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>New Material</Text>
                <TouchableOpacity onPress={() => setShowMaterialForm(false)}>
                  <Ionicons name="close-circle" size={24} color="#999999" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Material Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Ethernet Cable, Router, Screws"
                value={materialName}
                onChangeText={setMaterialName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={materialQuantity}
                    onChangeText={setMaterialQuantity}
                    keyboardType="decimal-pad"
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
                style={styles.textArea}
                placeholder="Additional details about this material..."
                value={materialNotes}
                onChangeText={setMaterialNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddMaterial}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Material</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Materials List */}
        <View style={styles.section}>
          {wcfData.materials.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.listTitle}>
                Materials Added ({wcfData.materials.length})
              </Text>

              {wcfData.materials.map((material) => (
                <View key={material.id} style={styles.materialItem}>
                  <View style={styles.materialIcon}>
                    <Ionicons name="cube" size={24} color="#007AFF" />
                  </View>

                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName}>{material.materialName}</Text>
                    <Text style={styles.materialQuantity}>
                      {material.quantity} {material.unit}
                    </Text>
                    {material.notes && (
                      <Text style={styles.materialNotes}>{material.notes}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => removeMaterial(material.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Materials Added</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Add Material" to record materials used
              </Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Recording materials is optional, but recommended for accurate inventory tracking and billing
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={onPrevious}
        >
          <Ionicons name="arrow-back" size={20} color="#007AFF" />
          <Text style={styles.buttonTextSecondary}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={onNext}
        >
          <Text style={styles.buttonTextPrimary}>Next: Extras</Text>
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
  headerSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    lineHeight: 20,
  },
  section: {
    padding: 16,
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
  addMaterialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addMaterialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  materialQuantity: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  materialNotes: {
    fontSize: 13,
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WCFStepMaterials;
