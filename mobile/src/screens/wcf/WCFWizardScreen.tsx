import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWCFStore } from '@store/wcf.store';
import type { ExecutionsStackParamList } from '@navigation/types';

// Import step components (to be created)
import WCFStepLabor from '@components/wcf/WCFStepLabor';
import WCFStepMaterials from '@components/wcf/WCFStepMaterials';
import WCFStepExtras from '@components/wcf/WCFStepExtras';
import WCFStepIssues from '@components/wcf/WCFStepIssues';
import WCFStepReview from '@components/wcf/WCFStepReview';

type NavigationProp = NativeStackNavigationProp<ExecutionsStackParamList, 'WCFWizard'>;
type WCFWizardRouteProp = RouteProp<ExecutionsStackParamList, 'WCFWizard'>;

interface Step {
  id: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  component: React.ComponentType<StepProps>;
  isValid: () => boolean;
}

interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WCFWizardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WCFWizardRouteProp>();
  const { serviceOrderId } = route.params;

  const {
    wcfData,
    initializeWCF,
    setCurrentStep,
    markComplete,
    resetWCF,
  } = useWCFStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Initialize WCF data when component mounts
  useEffect(() => {
    initializeWCF(serviceOrderId);
    return () => {
      // Optionally reset WCF on unmount if not submitted
      if (!wcfData.isComplete) {
        // Could save to local storage here for recovery
      }
    };
  }, [serviceOrderId]);

  const steps: Step[] = [
    {
      id: 1,
      title: 'Labor',
      icon: 'time-outline',
      component: WCFStepLabor,
      isValid: () => {
        return (
          wcfData.workDescription.trim().length > 0 &&
          wcfData.tasksCompleted.length > 0 &&
          wcfData.workDurationMinutes > 0
        );
      },
    },
    {
      id: 2,
      title: 'Materials',
      icon: 'cube-outline',
      component: WCFStepMaterials,
      isValid: () => true, // Materials are optional
    },
    {
      id: 3,
      title: 'Extras',
      icon: 'cash-outline',
      component: WCFStepExtras,
      isValid: () => {
        // If there are extra costs requiring approval, they must be approved
        const unapprovedCosts = wcfData.extraCosts.filter(
          (c) => c.requiresApproval && !c.approved
        );
        return unapprovedCosts.length === 0;
      },
    },
    {
      id: 4,
      title: 'Issues',
      icon: 'alert-circle-outline',
      component: WCFStepIssues,
      isValid: () => {
        // If completion status is INCOMPLETE, must have at least one issue
        if (wcfData.completionStatus === 'INCOMPLETE') {
          return wcfData.issues.length > 0;
        }
        return true;
      },
    },
    {
      id: 5,
      title: 'Review',
      icon: 'checkmark-circle-outline',
      component: WCFStepReview,
      isValid: () => {
        // All previous steps must be valid
        return steps.slice(0, 4).every((step) => step.isValid());
      },
    },
  ];

  const currentStep = steps[currentStepIndex];
  const StepComponent = currentStep.component;

  const handleNext = () => {
    if (!currentStep.isValid()) {
      Alert.alert('Incomplete', 'Please complete all required fields before continuing.');
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCurrentStep(nextIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setCurrentStep(prevIndex + 1);
    }
  };

  const handleStepPress = (index: number) => {
    // Can only navigate to completed steps or the next step
    if (index <= currentStepIndex + 1) {
      setCurrentStepIndex(index);
      setCurrentStep(index + 1);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel WCF',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        {
          text: 'Cancel WCF',
          style: 'destructive',
          onPress: () => {
            resetWCF();
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#FF3B30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Closing Form</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={styles.stepIndicator}
            onPress={() => handleStepPress(index)}
            disabled={index > currentStepIndex + 1}
          >
            <View
              style={[
                styles.stepCircle,
                index === currentStepIndex && styles.stepCircleActive,
                index < currentStepIndex && styles.stepCircleCompleted,
                index > currentStepIndex && styles.stepCircleInactive,
              ]}
            >
              {index < currentStepIndex ? (
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={step.icon}
                  size={20}
                  color={index === currentStepIndex ? '#FFFFFF' : '#999999'}
                />
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                index === currentStepIndex && styles.stepLabelActive,
              ]}
            >
              {step.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        <StepComponent
          onNext={handleNext}
          onPrevious={handlePrevious}
          isFirstStep={currentStepIndex === 0}
          isLastStep={currentStepIndex === steps.length - 1}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  stepCircleCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  stepCircleInactive: {
    backgroundColor: '#F9F9F9',
    borderColor: '#CCCCCC',
  },
  stepLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default WCFWizardScreen;
