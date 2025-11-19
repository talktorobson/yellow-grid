import { create } from 'zustand';

export interface WCFMaterial {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface WCFExtraCost {
  id: string;
  description: string;
  amount: number;
  requiresApproval: boolean;
  approved?: boolean;
  justification: string;
}

export interface WCFIssue {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolution?: string;
  affectsCompletion: boolean;
}

export interface WCFData {
  // Step 1: Labor Summary
  workDescription: string;
  tasksCompleted: string[];
  workDurationMinutes: number;
  breakDurationMinutes: number;

  // Step 2: Materials Used
  materials: WCFMaterial[];

  // Step 3: Extra Costs/Changes
  extraCosts: WCFExtraCost[];
  scopeChanges?: string;

  // Step 4: Issues Encountered
  issues: WCFIssue[];

  // Step 5: Review (Customer feedback)
  customerRating: number;
  customerComments?: string;
  wouldRecommend: boolean;
  nextVisitRequired: boolean;
  nextVisitReason?: string;

  // Metadata
  completionStatus: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'INCOMPLETE';
  currentStep: number;
  isComplete: boolean;
}

interface WCFStore {
  wcfData: WCFData;
  currentServiceOrderId: string | null;

  // Actions
  initializeWCF: (serviceOrderId: string) => void;
  setCurrentStep: (step: number) => void;
  updateLaborData: (data: Partial<Pick<WCFData, 'workDescription' | 'tasksCompleted' | 'workDurationMinutes' | 'breakDurationMinutes'>>) => void;
  addTask: (task: string) => void;
  removeTask: (index: number) => void;
  updateMaterialsData: (materials: WCFMaterial[]) => void;
  addMaterial: (material: WCFMaterial) => void;
  removeMaterial: (id: string) => void;
  updateExtraCosts: (costs: WCFExtraCost[]) => void;
  addExtraCost: (cost: WCFExtraCost) => void;
  removeExtraCost: (id: string) => void;
  updateIssues: (issues: WCFIssue[]) => void;
  addIssue: (issue: WCFIssue) => void;
  removeIssue: (id: string) => void;
  updateReviewData: (data: Partial<Pick<WCFData, 'customerRating' | 'customerComments' | 'wouldRecommend' | 'nextVisitRequired' | 'nextVisitReason'>>) => void;
  setCompletionStatus: (status: WCFData['completionStatus']) => void;
  markComplete: () => void;
  resetWCF: () => void;
}

const initialWCFData: WCFData = {
  workDescription: '',
  tasksCompleted: [],
  workDurationMinutes: 0,
  breakDurationMinutes: 0,
  materials: [],
  extraCosts: [],
  issues: [],
  customerRating: 5,
  customerComments: undefined,
  wouldRecommend: true,
  nextVisitRequired: false,
  nextVisitReason: undefined,
  completionStatus: 'COMPLETED',
  currentStep: 1,
  isComplete: false,
};

export const useWCFStore = create<WCFStore>((set) => ({
  wcfData: initialWCFData,
  currentServiceOrderId: null,

  initializeWCF: (serviceOrderId) => set({
    currentServiceOrderId: serviceOrderId,
    wcfData: initialWCFData,
  }),

  setCurrentStep: (step) => set((state) => ({
    wcfData: { ...state.wcfData, currentStep: step },
  })),

  updateLaborData: (data) => set((state) => ({
    wcfData: { ...state.wcfData, ...data },
  })),

  addTask: (task) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      tasksCompleted: [...state.wcfData.tasksCompleted, task],
    },
  })),

  removeTask: (index) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      tasksCompleted: state.wcfData.tasksCompleted.filter((_, i) => i !== index),
    },
  })),

  updateMaterialsData: (materials) => set((state) => ({
    wcfData: { ...state.wcfData, materials },
  })),

  addMaterial: (material) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      materials: [...state.wcfData.materials, material],
    },
  })),

  removeMaterial: (id) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      materials: state.wcfData.materials.filter((m) => m.id !== id),
    },
  })),

  updateExtraCosts: (costs) => set((state) => ({
    wcfData: { ...state.wcfData, extraCosts: costs },
  })),

  addExtraCost: (cost) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      extraCosts: [...state.wcfData.extraCosts, cost],
    },
  })),

  removeExtraCost: (id) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      extraCosts: state.wcfData.extraCosts.filter((c) => c.id !== id),
    },
  })),

  updateIssues: (issues) => set((state) => ({
    wcfData: { ...state.wcfData, issues },
  })),

  addIssue: (issue) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      issues: [...state.wcfData.issues, issue],
    },
  })),

  removeIssue: (id) => set((state) => ({
    wcfData: {
      ...state.wcfData,
      issues: state.wcfData.issues.filter((i) => i.id !== id),
    },
  })),

  updateReviewData: (data) => set((state) => ({
    wcfData: { ...state.wcfData, ...data },
  })),

  setCompletionStatus: (status) => set((state) => ({
    wcfData: { ...state.wcfData, completionStatus: status },
  })),

  markComplete: () => set((state) => ({
    wcfData: { ...state.wcfData, isComplete: true },
  })),

  resetWCF: () => set({
    wcfData: initialWCFData,
    currentServiceOrderId: null,
  }),
}));
