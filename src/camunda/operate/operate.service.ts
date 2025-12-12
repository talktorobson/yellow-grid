import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Process Instance from Operate API
 */
export interface ProcessInstance {
  key: number;
  processDefinitionKey: number;
  bpmnProcessId: string;
  version: number;
  startDate: string;
  endDate?: string;
  state: 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'INCIDENT';
  parentKey?: number;
  parentFlowNodeInstanceKey?: number;
}

/**
 * Incident from Operate API
 */
export interface Incident {
  key: number;
  processDefinitionKey: number;
  processInstanceKey: number;
  type: string;
  message: string;
  state: 'ACTIVE' | 'RESOLVED';
  creationTime: string;
  flowNodeId: string;
  flowNodeInstanceKey: number;
  jobKey?: number;
}

/**
 * Variable from Operate API
 */
export interface Variable {
  key: number;
  processInstanceKey: number;
  scopeKey: number;
  name: string;
  value: string;
  truncated: boolean;
}

/**
 * Flow Node Instance from Operate API
 */
export interface FlowNodeInstance {
  key: number;
  processInstanceKey: number;
  processDefinitionKey: number;
  startDate: string;
  endDate?: string;
  flowNodeId: string;
  flowNodeName?: string;
  state: 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'INCIDENT';
  type: string;
  incident: boolean;
  incidentKey?: number;
}

/**
 * Operate Service
 * 
 * Provides access to Camunda Operate API for:
 * - Process instance monitoring
 * - Incident management
 * - Variable inspection
 * - Flow node state tracking
 */
@Injectable()
export class OperateService {
  private readonly logger = new Logger(OperateService.name);
  private readonly baseUrl: string;
  private readonly auth: { username: string; password: string } | null;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OPERATE_URL', 'http://localhost:8081');
    
    const username = this.configService.get<string>('OPERATE_USERNAME');
    const password = this.configService.get<string>('OPERATE_PASSWORD');
    
    if (username && password) {
      this.auth = { username, password };
    } else {
      this.auth = null;
    }
  }

  /**
   * Get process instances with optional filtering
   */
  async getProcessInstances(options: {
    bpmnProcessId?: string;
    state?: ProcessInstance['state'];
    startDateAfter?: Date;
    startDateBefore?: Date;
    size?: number;
  } = {}): Promise<ProcessInstance[]> {
    const { bpmnProcessId, state, startDateAfter, startDateBefore, size = 50 } = options;
    
    const filter: Record<string, any> = {};
    
    if (bpmnProcessId) filter.bpmnProcessId = bpmnProcessId;
    if (state) filter.state = state;
    if (startDateAfter) filter.startDate = { $gte: startDateAfter.toISOString() };
    if (startDateBefore) {
      filter.startDate = { ...filter.startDate, $lt: startDateBefore.toISOString() };
    }

    return this.post<ProcessInstance[]>('/v1/process-instances/search', {
      filter,
      size,
      sort: [{ field: 'startDate', order: 'DESC' }],
    });
  }

  /**
   * Get a single process instance by key
   */
  async getProcessInstance(key: number): Promise<ProcessInstance> {
    return this.get<ProcessInstance>(`/v1/process-instances/${key}`);
  }

  /**
   * Get incidents for a process instance
   */
  async getIncidents(processInstanceKey?: number): Promise<Incident[]> {
    const filter: Record<string, any> = { state: 'ACTIVE' };
    
    if (processInstanceKey) {
      filter.processInstanceKey = processInstanceKey;
    }

    return this.post<Incident[]>('/v1/incidents/search', {
      filter,
      size: 100,
      sort: [{ field: 'creationTime', order: 'DESC' }],
    });
  }

  /**
   * Get all active incidents (useful for monitoring dashboard)
   */
  async getActiveIncidents(): Promise<Incident[]> {
    return this.getIncidents();
  }

  /**
   * Get incidents grouped by error type
   */
  async getIncidentsSummary(): Promise<Map<string, Incident[]>> {
    const incidents = await this.getActiveIncidents();
    const grouped = new Map<string, Incident[]>();

    for (const incident of incidents) {
      const existing = grouped.get(incident.type) || [];
      existing.push(incident);
      grouped.set(incident.type, existing);
    }

    return grouped;
  }

  /**
   * Get variables for a process instance
   */
  async getVariables(processInstanceKey: number): Promise<Variable[]> {
    return this.post<Variable[]>('/v1/variables/search', {
      filter: { processInstanceKey },
      size: 100,
    });
  }

  /**
   * Get variable by name for a process instance
   */
  async getVariable(processInstanceKey: number, name: string): Promise<Variable | null> {
    const variables = await this.post<Variable[]>('/v1/variables/search', {
      filter: { processInstanceKey, name },
      size: 1,
    });
    return variables[0] || null;
  }

  /**
   * Get flow node instances for a process instance
   */
  async getFlowNodeInstances(processInstanceKey: number): Promise<FlowNodeInstance[]> {
    return this.post<FlowNodeInstance[]>('/v1/flownode-instances/search', {
      filter: { processInstanceKey },
      size: 100,
      sort: [{ field: 'startDate', order: 'ASC' }],
    });
  }

  /**
   * Get current active flow nodes (useful for debugging)
   */
  async getActiveFlowNodes(processInstanceKey: number): Promise<FlowNodeInstance[]> {
    return this.post<FlowNodeInstance[]>('/v1/flownode-instances/search', {
      filter: { processInstanceKey, state: 'ACTIVE' },
      size: 100,
    });
  }

  /**
   * Get process instance with full details for debugging
   */
  async getProcessInstanceDetails(key: number): Promise<{
    instance: ProcessInstance;
    variables: Variable[];
    flowNodes: FlowNodeInstance[];
    incidents: Incident[];
  }> {
    const [instance, variables, flowNodes, incidents] = await Promise.all([
      this.getProcessInstance(key),
      this.getVariables(key),
      this.getFlowNodeInstances(key),
      this.getIncidents(key),
    ]);

    return { instance, variables, flowNodes, incidents };
  }

  /**
   * Find process instance by service order ID (business key correlation)
   */
  async findByServiceOrderId(serviceOrderId: string): Promise<ProcessInstance | null> {
    // Search for process instances where serviceOrderId variable matches
    const instances = await this.post<ProcessInstance[]>('/v1/process-instances/search', {
      filter: {
        bpmnProcessId: 'ServiceOrderLifecycle',
        state: 'ACTIVE',
      },
      size: 100,
    });

    // Filter by variable (Operate doesn't support variable filtering in search)
    for (const instance of instances) {
      const variable = await this.getVariable(instance.key, 'serviceOrderId');
      if (variable && variable.value === `"${serviceOrderId}"`) {
        return instance;
      }
    }

    return null;
  }

  // HTTP helpers

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Operate API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Operate API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.items || data;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.auth) {
      const credentials = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }
}
