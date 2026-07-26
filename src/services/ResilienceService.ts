export interface ServiceHealthStatus {
  status: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL';
  gemini: {
    status: 'OPERACIONAL' | 'INDISPONIVEL';
    details: string;
  };
  whatsapp: {
    status: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL';
    configured: boolean;
    details: string;
  };
  firestore: {
    status: 'OPERACIONAL' | 'DEGRADADO';
    details: string;
  };
  queue: {
    pendingCount: number;
    waitingSendCount: number;
    failedCount: number;
    totalInQueue: number;
  };
  botActive: boolean;
  lastCheckedAt: string;
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

export interface QueuedMessage {
  id: string;
  conversationId: string;
  customerPhone: string;
  customerName: string;
  text: string;
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  timestamp: string;
  status: 'RECEBIDA' | 'PROCESSANDO' | 'RESPONDIDA' | 'PENDENTE' | 'AGUARDANDO ENVIO' | 'FALHOU';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextAttemptAt?: string;
  preparedResponse?: any;
}

class ResilienceService {
  /**
   * Get real-time health check status from server
   */
  public async getHealthStatus(): Promise<ServiceHealthStatus> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('[ResilienceService] Erro ao consultar saúde do sistema:', err);
    }

    return {
      status: 'DEGRADADO',
      gemini: { status: 'OPERACIONAL', details: 'Modo local' },
      whatsapp: { status: 'DEGRADADO', configured: false, details: 'Ambiente local' },
      firestore: { status: 'OPERACIONAL', details: 'Persistência ativa' },
      queue: { pendingCount: 0, waitingSendCount: 0, failedCount: 0, totalInQueue: 0 },
      botActive: true,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Get system failure logs
   */
  public async getFailureLogs(): Promise<SystemFailureLog[]> {
    try {
      const res = await fetch('/api/resilience/failure-logs');
      if (res.ok) {
        const data = await res.json();
        return data.logs || [];
      }
    } catch (err) {
      console.error('[ResilienceService] Erro ao buscar logs de falha:', err);
    }
    return [];
  }

  /**
   * Get owner alerts
   */
  public async getOwnerAlerts(): Promise<OwnerAlert[]> {
    try {
      const res = await fetch('/api/resilience/alerts');
      if (res.ok) {
        const data = await res.json();
        return data.alerts || [];
      }
    } catch (err) {
      console.error('[ResilienceService] Erro ao buscar alertas do proprietário:', err);
    }
    return [];
  }

  /**
   * Resolve an alert
   */
  public async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/resilience/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get message queue list
   */
  public async getMessageQueue(): Promise<QueuedMessage[]> {
    try {
      const res = await fetch('/api/resilience/queue');
      if (res.ok) {
        const data = await res.json();
        return data.queue || [];
      }
    } catch (err) {
      console.error('[ResilienceService] Erro ao buscar fila de mensagens:', err);
    }
    return [];
  }

  /**
   * Run a failure simulation test
   */
  public async runSimulation(action: string, params: any = {}): Promise<any> {
    try {
      const res = await fetch('/api/resilience/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get bot online status
   */
  public async getBotStatus(): Promise<boolean> {
    try {
      const res = await fetch('/api/bot-status');
      if (res.ok) {
        const data = await res.json();
        return Boolean(data.active);
      }
    } catch {
      return true;
    }
    return true;
  }

  /**
   * Set bot status
   */
  public async setBotStatus(active: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/bot-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get human takeover list
   */
  public async getHumanTakeoverList(): Promise<string[]> {
    try {
      const res = await fetch('/api/human-takeover');
      if (res.ok) {
        const data = await res.json();
        return data.takeoverList || [];
      }
    } catch {
      return [];
    }
    return [];
  }

  /**
   * Set human takeover for customer
   */
  public async setHumanTakeover(customerId: string, takeover: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/human-takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, takeover }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const resilienceService = new ResilienceService();
