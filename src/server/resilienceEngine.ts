import fs from 'fs';
import path from 'path';

export type MessageProcessingState =
  | 'RECEBIDA'
  | 'PROCESSANDO'
  | 'RESPONDIDA'
  | 'PENDENTE'
  | 'AGUARDANDO ENVIO'
  | 'FALHOU';

export interface QueuedMessage {
  id: string; // WhatsApp Message ID or generated UUID
  conversationId: string;
  customerPhone: string;
  customerName: string;
  text: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  timestamp: string;
  status: MessageProcessingState;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextAttemptAt?: string;
  preparedResponse?: {
    reply: string;
    proposalGenerated?: boolean;
    alertOwner?: boolean;
    leadTemperature?: string;
    salesTacticUsed?: string;
    reasoning?: string;
    proposalDetails?: any;
  };
  processedAt?: string;
}

export interface SystemFailureLog {
  id: string;
  timestamp: string;
  service: 'GEMINI' | 'WHATSAPP' | 'FIRESTORE' | 'ORDER_PROCESSOR' | 'SYSTEM';
  operation: string;
  relatedId: string;
  errorType: string;
  errorMessage: string;
  retryCount: number;
  finalState: 'PENDENTE' | 'AGUARDANDO ENVIO' | 'RECUPERADO' | 'FALHA - INTERVENCAO NECESSARIA';
}

export interface OwnerAlert {
  id: string;
  timestamp: string;
  type:
    | 'WHATSAPP_DESCONECTADO'
    | 'GEMINI_INDISPONIVEL'
    | 'MENSAGEM_NAO_ENVIADA'
    | 'PEDIDO_COM_ERRO'
    | 'PAGAMENTO_AGUARDANDO_VERIFICACAO';
  title: string;
  description: string;
  severity: 'ALTA' | 'CRITICA' | 'MEDIA';
  relatedId?: string;
  resolved: boolean;
}

export interface SimulationState {
  simulateGeminiError: boolean;
  simulateWhatsAppError: boolean;
  simulateFirestoreError: boolean;
  simulateNetworkLatencyMs: number;
}

interface PersistentStateSchema {
  isBotActive: boolean;
  humanTakeoverList: string[]; // customer IDs
  processedMessageIds: string[];
  processedOrderKeys: string[];
  messageQueue: QueuedMessage[];
  systemFailureLogs: SystemFailureLog[];
  ownerAlerts: OwnerAlert[];
  lastUpdated: string;
}

class ResilienceEngine {
  private STATE_FILE = path.join(process.cwd(), 'data_resilience_state.json');

  public isBotActive: boolean = true;
  public humanTakeoverSet: Set<string> = new Set();
  public processedMessageIds: Set<string> = new Set();
  public processedOrderKeys: Map<string, any> = new Map();
  public messageQueue: Map<string, QueuedMessage> = new Map();
  public systemFailureLogs: SystemFailureLog[] = [];
  public ownerAlerts: OwnerAlert[] = [];

  public simulations: SimulationState = {
    simulateGeminiError: false,
    simulateWhatsAppError: false,
    simulateFirestoreError: false,
    simulateNetworkLatencyMs: 0,
  };

  constructor() {
    this.loadStateFromDisk();
  }

  /**
   * Load state from persistent disk storage to survive Cloud Function/Server restarts
   */
  private loadStateFromDisk() {
    try {
      if (fs.existsSync(this.STATE_FILE)) {
        const raw = fs.readFileSync(this.STATE_FILE, 'utf-8');
        const data: PersistentStateSchema = JSON.parse(raw);

        this.isBotActive = data.isBotActive ?? true;

        if (Array.isArray(data.humanTakeoverList)) {
          this.humanTakeoverSet = new Set(data.humanTakeoverList);
        }

        if (Array.isArray(data.processedMessageIds)) {
          this.processedMessageIds = new Set(data.processedMessageIds);
        }

        if (Array.isArray(data.messageQueue)) {
          data.messageQueue.forEach((m) => this.messageQueue.set(m.id, m));
        }

        if (Array.isArray(data.systemFailureLogs)) {
          this.systemFailureLogs = data.systemFailureLogs;
        }

        if (Array.isArray(data.ownerAlerts)) {
          this.ownerAlerts = data.ownerAlerts;
        }

        console.log(
          `[ResilienceEngine] Estado recuperado do disco com sucesso! Bot: ${
            this.isBotActive ? 'ONLINE' : 'OFFLINE'
          } | Mensagens na fila: ${this.messageQueue.size} | Conversas humanas: ${
            this.humanTakeoverSet.size
          }`
        );
      } else {
        console.log('[ResilienceEngine] Inicializando novo estado de resiliência.');
        this.saveStateToDisk();
      }
    } catch (err: any) {
      console.error('[ResilienceEngine] Erro ao carregar estado do disco:', err?.message);
    }
  }

  /**
   * Save current engine state to disk
   */
  public saveStateToDisk() {
    try {
      const data: PersistentStateSchema = {
        isBotActive: this.isBotActive,
        humanTakeoverList: Array.from(this.humanTakeoverSet),
        processedMessageIds: Array.from(this.processedMessageIds).slice(-1000), // Keep last 1000
        processedOrderKeys: Array.from(this.processedOrderKeys.keys()).slice(-500),
        messageQueue: Array.from(this.messageQueue.values()).slice(-200), // Keep last 200
        systemFailureLogs: this.systemFailureLogs.slice(0, 500), // Keep last 500
        ownerAlerts: this.ownerAlerts.slice(0, 100),
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ResilienceEngine] Erro ao persistir estado no disco:', err?.message);
    }
  }

  // -------------------------------------------------------------
  // BOT STATUS & HUMAN TAKEOVER PERSISTENCE
  // -------------------------------------------------------------
  public setBotStatus(active: boolean) {
    this.isBotActive = active;
    this.saveStateToDisk();
  }

  public setHumanTakeover(customerId: string, takeover: boolean) {
    if (takeover) {
      this.humanTakeoverSet.add(customerId);
    } else {
      this.humanTakeoverSet.delete(customerId);
    }
    this.saveStateToDisk();
  }

  public isHumanTakeover(customerId: string): boolean {
    return this.humanTakeoverSet.has(customerId);
  }

  // -------------------------------------------------------------
  // MESSAGE QUEUE & IDEMPOTENCY
  // -------------------------------------------------------------
  public isMessageProcessed(messageId: string): boolean {
    if (!messageId) return false;
    if (this.processedMessageIds.has(messageId)) return true;
    const existing = this.messageQueue.get(messageId);
    return Boolean(existing && existing.status === 'RESPONDIDA');
  }

  public enqueueMessage(msg: {
    id: string;
    conversationId: string;
    customerPhone: string;
    customerName: string;
    text: string;
    type?: 'text' | 'image' | 'audio' | 'document' | 'location';
  }): QueuedMessage {
    const existing = this.messageQueue.get(msg.id);
    if (existing) {
      return existing;
    }

    const queuedMsg: QueuedMessage = {
      id: msg.id,
      conversationId: msg.conversationId || `conv-${msg.customerPhone}`,
      customerPhone: msg.customerPhone,
      customerName: msg.customerName || 'Cliente Produtor',
      text: msg.text,
      type: msg.type || 'text',
      timestamp: new Date().toISOString(),
      status: 'RECEBIDA',
      attempts: 0,
      maxAttempts: 3,
    };

    this.messageQueue.set(msg.id, queuedMsg);
    this.saveStateToDisk();
    return queuedMsg;
  }

  public updateMessageStatus(
    id: string,
    status: MessageProcessingState,
    extra?: {
      lastError?: string;
      preparedResponse?: any;
      incrementAttempt?: boolean;
    }
  ): QueuedMessage | null {
    const msg = this.messageQueue.get(id);
    if (!msg) return null;

    msg.status = status;
    if (extra?.lastError) msg.lastError = extra.lastError;
    if (extra?.preparedResponse) msg.preparedResponse = extra.preparedResponse;
    if (extra?.incrementAttempt) msg.attempts += 1;

    if (status === 'RESPONDIDA') {
      msg.processedAt = new Date().toISOString();
      this.processedMessageIds.add(id);
    }

    if (status === 'PENDENTE' || status === 'AGUARDANDO ENVIO') {
      // Exponential backoff delay calculation (2s, 5s, 12s...)
      const delaySec = Math.pow(2, msg.attempts) * 2;
      msg.nextAttemptAt = new Date(Date.now() + delaySec * 1000).toISOString();
    }

    this.messageQueue.set(id, msg);
    this.saveStateToDisk();
    return msg;
  }

  // -------------------------------------------------------------
  // FAILURE LOGGING & OWNER ALERTS
  // -------------------------------------------------------------
  public addFailureLog(log: Omit<SystemFailureLog, 'id' | 'timestamp'>): SystemFailureLog {
    const fullLog: SystemFailureLog = {
      ...log,
      id: `fail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    this.systemFailureLogs.unshift(fullLog);
    if (this.systemFailureLogs.length > 500) this.systemFailureLogs.pop();

    this.saveStateToDisk();
    return fullLog;
  }

  public addOwnerAlert(alertInput: {
    type: OwnerAlert['type'];
    title: string;
    description: string;
    severity?: OwnerAlert['severity'];
    relatedId?: string;
  }): OwnerAlert {
    // Avoid creating exact duplicate active alert
    const existing = this.ownerAlerts.find(
      (a) => !a.resolved && a.type === alertInput.type && a.relatedId === alertInput.relatedId
    );
    if (existing) {
      existing.timestamp = new Date().toISOString();
      existing.description = alertInput.description;
      this.saveStateToDisk();
      return existing;
    }

    const alert: OwnerAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: alertInput.type,
      title: alertInput.title,
      description: alertInput.description,
      severity: alertInput.severity || 'ALTA',
      relatedId: alertInput.relatedId,
      resolved: false,
    };

    this.ownerAlerts.unshift(alert);
    this.saveStateToDisk();
    return alert;
  }

  public resolveAlert(alertId: string) {
    const alert = this.ownerAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.saveStateToDisk();
    }
  }

  // -------------------------------------------------------------
  // ORDER IDEMPOTENCY & ATOMIC STOCK DEDUCTION
  // -------------------------------------------------------------
  public registerOrderKey(key: string, orderData: any): boolean {
    if (this.processedOrderKeys.has(key)) {
      return false; // Already created
    }
    this.processedOrderKeys.set(key, orderData);
    this.saveStateToDisk();
    return true;
  }

  public getExistingOrderKey(key: string): any | null {
    return this.processedOrderKeys.get(key) || null;
  }
}

export const resilienceEngine = new ResilienceEngine();
