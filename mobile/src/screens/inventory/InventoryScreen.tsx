import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type TabType = 'RESERVED' | 'ON_HAND';

interface InventoryItem {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  category: string;
  quantity: number;
  unit: string;
  location?: string;
  reservedFor?: string; // Service Order ID
  lowStockThreshold?: number;
  lastUpdated: string;
}

interface ActionModalState {
  visible: boolean;
  type: 'CONSUME' | 'REQUEST' | 'TRANSFER' | null;
  item: InventoryItem | null;
}

const InventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ON_HAND');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Action modal state
  const [actionModal, setActionModal] = useState<ActionModalState>({
    visible: false,
    type: null,
    item: null,
  });
  const [actionQuantity, setActionQuantity] = useState('');
  const [transferTeammate, setTransferTeammate] = useState('');
  const [requestReason, setRequestReason] = useState('');

  // Mock data - would come from API/store
  const [reservedItems] = useState<InventoryItem[]>([
    {
      id: '1',
      materialId: 'MAT-001',
      materialName: 'Photovoltaic Panel 400W',
      materialCode: 'PV-400-MONO',
      category: 'Solar Panels',
      quantity: 8,
      unit: 'units',
      reservedFor: 'SO-2024-001',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '2',
      materialId: 'MAT-002',
      materialName: 'Inverter 5kW',
      materialCode: 'INV-5K-HYBRID',
      category: 'Inverters',
      quantity: 1,
      unit: 'unit',
      reservedFor: 'SO-2024-001',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '3',
      materialId: 'MAT-003',
      materialName: 'Mounting Rails 4m',
      materialCode: 'RAIL-4M-ALU',
      category: 'Mounting',
      quantity: 16,
      unit: 'units',
      reservedFor: 'SO-2024-002',
      lastUpdated: new Date().toISOString(),
    },
  ]);

  const [onHandItems] = useState<InventoryItem[]>([
    {
      id: '4',
      materialId: 'MAT-004',
      materialName: 'Cable 6mm² Black',
      materialCode: 'CAB-6MM-BLK',
      category: 'Cables',
      quantity: 50,
      unit: 'meters',
      location: 'Van - Compartment A',
      lowStockThreshold: 20,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '5',
      materialId: 'MAT-005',
      materialName: 'Cable 6mm² Red',
      materialCode: 'CAB-6MM-RED',
      category: 'Cables',
      quantity: 45,
      unit: 'meters',
      location: 'Van - Compartment A',
      lowStockThreshold: 20,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '6',
      materialId: 'MAT-006',
      materialName: 'MC4 Connectors',
      materialCode: 'MC4-PAIR',
      category: 'Connectors',
      quantity: 12,
      unit: 'pairs',
      location: 'Van - Compartment B',
      lowStockThreshold: 10,
      lastUpdated: new Date().toISOString(),
    },
    {
      id: '7',
      materialId: 'MAT-007',
      materialName: 'Cable Ties Heavy Duty',
      materialCode: 'CT-HEAVY-500MM',
      category: 'Consumables',
      quantity: 5,
      unit: 'packs',
      location: 'Van - Compartment C',
      lowStockThreshold: 10,
      lastUpdated: new Date().toISOString(),
    },
  ]);

  const filteredReservedItems = reservedItems.filter((item) =>
    item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.materialCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOnHandItems = onHandItems.filter((item) =>
    item.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.materialCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch inventory from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const openActionModal = (type: 'CONSUME' | 'REQUEST' | 'TRANSFER', item: InventoryItem) => {
    setActionModal({ visible: true, type, item });
    setActionQuantity('');
    setTransferTeammate('');
    setRequestReason('');
  };

  const closeActionModal = () => {
    setActionModal({ visible: false, type: null, item: null });
  };

  const handleConsumeItem = async () => {
    const quantity = parseFloat(actionQuantity);
    if (!quantity || quantity <= 0 || quantity > (actionModal.item?.quantity || 0)) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }

    // TODO: Call API to consume item
    Alert.alert('Success', `Consumed ${quantity} ${actionModal.item?.unit} of ${actionModal.item?.materialName}`);
    closeActionModal();
  };

  const handleRequestItem = async () => {
    const quantity = parseFloat(actionQuantity);
    if (!quantity || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }
    if (!requestReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for this request');
      return;
    }

    // TODO: Call API to request item
    Alert.alert('Success', `Request submitted for ${quantity} ${actionModal.item?.unit} of ${actionModal.item?.materialName}`);
    closeActionModal();
  };

  const handleTransferItem = async () => {
    const quantity = parseFloat(actionQuantity);
    if (!quantity || quantity <= 0 || quantity > (actionModal.item?.quantity || 0)) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }
    if (!transferTeammate.trim()) {
      Alert.alert('Teammate Required', 'Please select a teammate to transfer to');
      return;
    }

    // TODO: Call API to transfer item
    Alert.alert('Success', `Transfer initiated: ${quantity} ${actionModal.item?.unit} to ${transferTeammate}`);
    closeActionModal();
  };

  const handleSubmitAction = () => {
    switch (actionModal.type) {
      case 'CONSUME':
        handleConsumeItem();
        break;
      case 'REQUEST':
        handleRequestItem();
        break;
      case 'TRANSFER':
        handleTransferItem();
        break;
    }
  };

  const isLowStock = (item: InventoryItem): boolean => {
    return item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold;
  };

  const renderInventoryItem = (item: InventoryItem, isReserved: boolean) => {
    const lowStock = isLowStock(item);

    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemName}>{item.materialName}</Text>
            <Text style={styles.itemCode}>{item.materialCode}</Text>
          </View>
          {lowStock && (
            <View style={styles.lowStockBadge}>
              <Ionicons name="warning" size={14} color="#FF9500" />
              <Text style={styles.lowStockText}>Low Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="apps-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.category}</Text>
          </View>

          {item.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.infoText}>{item.location}</Text>
            </View>
          )}

          {item.reservedFor && (
            <View style={styles.infoRow}>
              <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
              <Text style={[styles.infoText, { color: '#007AFF' }]}>Reserved for {item.reservedFor}</Text>
            </View>
          )}
        </View>

        <View style={styles.itemFooter}>
          <View style={[styles.quantityBadge, lowStock && styles.quantityBadgeLow]}>
            <Text style={[styles.quantityText, lowStock && styles.quantityTextLow]}>
              {item.quantity} {item.unit}
            </Text>
          </View>

          <View style={styles.actions}>
            {!isReserved && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openActionModal('CONSUME', item)}
                >
                  <Ionicons name="remove-circle-outline" size={20} color="#FF3B30" />
                  <Text style={styles.actionButtonText}>Use</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openActionModal('TRANSFER', item)}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Transfer</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openActionModal('REQUEST', item)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#34C759" />
              <Text style={styles.actionButtonText}>Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderActionModal = () => {
    if (!actionModal.visible || !actionModal.item) return null;

    const getModalTitle = () => {
      switch (actionModal.type) {
        case 'CONSUME':
          return 'Consume Material';
        case 'REQUEST':
          return 'Request Material';
        case 'TRANSFER':
          return 'Transfer Material';
        default:
          return '';
      }
    };

    const getModalIcon = () => {
      switch (actionModal.type) {
        case 'CONSUME':
          return 'remove-circle';
        case 'REQUEST':
          return 'add-circle';
        case 'TRANSFER':
          return 'arrow-forward-circle';
        default:
          return 'help-circle';
      }
    };

    const getModalColor = () => {
      switch (actionModal.type) {
        case 'CONSUME':
          return '#FF3B30';
        case 'REQUEST':
          return '#34C759';
        case 'TRANSFER':
          return '#007AFF';
        default:
          return '#999';
      }
    };

    return (
      <Modal
        visible={actionModal.visible}
        animationType="slide"
        transparent
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: getModalColor() }]}>
              <Ionicons name={getModalIcon() as any} size={32} color="#FFFFFF" />
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalItemName}>{actionModal.item.materialName}</Text>
              <Text style={styles.modalItemCode}>{actionModal.item.materialCode}</Text>

              {actionModal.type !== 'REQUEST' && (
                <Text style={styles.modalAvailable}>
                  Available: {actionModal.item.quantity} {actionModal.item.unit}
                </Text>
              )}

              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter quantity (${actionModal.item.unit})`}
                value={actionQuantity}
                onChangeText={setActionQuantity}
                keyboardType="decimal-pad"
              />

              {actionModal.type === 'TRANSFER' && (
                <>
                  <Text style={styles.inputLabel}>Transfer To *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Select or enter teammate name"
                    value={transferTeammate}
                    onChangeText={setTransferTeammate}
                  />
                </>
              )}

              {actionModal.type === 'REQUEST' && (
                <>
                  <Text style={styles.inputLabel}>Reason *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Explain why you need this material"
                    value={requestReason}
                    onChangeText={setRequestReason}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeActionModal}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit, { backgroundColor: getModalColor() }]}
                onPress={handleSubmitAction}
              >
                <Text style={styles.modalButtonTextSubmit}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerSubtitle}>Van stock management</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search materials..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ON_HAND' && styles.tabActive]}
          onPress={() => setActiveTab('ON_HAND')}
        >
          <Ionicons
            name="cube"
            size={20}
            color={activeTab === 'ON_HAND' ? '#007AFF' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'ON_HAND' && styles.tabTextActive]}>
            On-Hand ({filteredOnHandItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'RESERVED' && styles.tabActive]}
          onPress={() => setActiveTab('RESERVED')}
        >
          <Ionicons
            name="bookmark"
            size={20}
            color={activeTab === 'RESERVED' ? '#007AFF' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'RESERVED' && styles.tabTextActive]}>
            Reserved ({filteredReservedItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'ON_HAND' ? (
          filteredOnHandItems.length > 0 ? (
            filteredOnHandItems.map((item) => renderInventoryItem(item, false))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No on-hand inventory</Text>
            </View>
          )
        ) : (
          filteredReservedItems.length > 0 ? (
            filteredReservedItems.map((item) => renderInventoryItem(item, true))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bookmark-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No reserved materials</Text>
            </View>
          )
        )}
      </ScrollView>

      {renderActionModal()}
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
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999999',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  itemCard: {
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 13,
    color: '#999999',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9500',
  },
  itemInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quantityBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quantityBadgeLow: {
    backgroundColor: '#FFF3E0',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  quantityTextLow: {
    color: '#FF9500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  modalItemCode: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 12,
  },
  modalAvailable: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSubmit: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  modalButtonTextSubmit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default InventoryScreen;
