import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import apiClient from '../../api/client';

const QUEUE_KEY = 'offline_action_queue';

export interface OfflineAction {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  payload: any;
  timestamp: number;
}

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private isProcessing = false;

  private constructor() {
    // Listen for connectivity changes
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.processQueue();
      }
    });
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  async addToQueue(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
    const queue = await this.getQueue();
    const newAction: OfflineAction = {
      ...action,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    queue.push(newAction);
    await this.saveQueue(queue);
    console.log('[OfflineQueue] Action added:', action.type);
  }

  async getQueue(): Promise<OfflineAction[]> {
    try {
      const json = await AsyncStorage.getItem(QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Failed to get queue', error);
      return [];
    }
  }

  private async saveQueue(queue: OfflineAction[]) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  async processQueue() {
    if (this.isProcessing) return;
    
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    this.isProcessing = true;
    console.log('[OfflineQueue] Processing queue...');

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      const remainingQueue: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await this.processAction(action);
        } catch (error) {
          console.error(`[OfflineQueue] Failed to process action ${action.type}:`, error);
          // Keep in queue if it's a network error, otherwise maybe discard or move to dead letter
          // For now, we keep it to retry
          remainingQueue.push(action);
        }
      }

      await this.saveQueue(remainingQueue);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAction(action: OfflineAction) {
    switch (action.type) {
      case 'CHECK_IN':
        await apiClient.post('/execution/check-in', action.payload);
        break;
      case 'CHECK_OUT':
        await apiClient.post('/execution/check-out', action.payload);
        break;
    }
  }
}
