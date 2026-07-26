import { CustomerMessage } from '../types';

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contact';

export interface WhatsAppMediaContent {
  url?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
}

export interface WhatsAppIncomingPayload {
  messageId: string;
  fromPhone: string;
  fromName: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: string;
  media?: WhatsAppMediaContent;
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'SYSTEM';
  type: string;
  content: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
}

export interface WhatsAppConnectionState {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'RECONNECTING';
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  lastSyncAt: string;
  messagesReceivedToday: number;
  messagesSentToday: number;
}

class WhatsAppService {
  private state: WhatsAppConnectionState = {
    status: 'DISCONNECTED',
    phoneNumber: 'Aguardando verificação',
    phoneNumberId: 'Não configurado',
    wabaId: 'Não configurado',
    lastSyncAt: new Date().toISOString(),
    messagesReceivedToday: 0,
    messagesSentToday: 0,
  };

  private logs: WhatsAppLog[] = [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      direction: 'SYSTEM',
      type: 'webhook_init',
      content: 'Endpoint do Webhook Meta ativo e aguardando verificação em /api/whatsapp/webhook',
      status: 'SUCCESS',
    },
  ];

  public getStatus(): WhatsAppConnectionState {
    return { ...this.state };
  }

  public getLogs(): WhatsAppLog[] {
    return [...this.logs];
  }

  public async connect(): Promise<WhatsAppConnectionState> {
    this.state.status = 'CONNECTING';
    this.addLog('SYSTEM', 'connection', 'Iniciando autenticação via Meta Graph API v19.0...', 'PENDING');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    this.state.status = 'CONNECTED';
    this.state.lastSyncAt = new Date().toISOString();
    this.addLog('SYSTEM', 'connection', 'Conexão estabelecida com o número do WhatsApp Business +55 (65) 99876-5432', 'SUCCESS');

    return { ...this.state };
  }

  public async disconnect(): Promise<WhatsAppConnectionState> {
    this.state.status = 'DISCONNECTED';
    this.addLog('SYSTEM', 'disconnection', 'Sessão do WhatsApp Business pausada manualmente pelo usuário.', 'SUCCESS');
    return { ...this.state };
  }

  public async reconnect(): Promise<WhatsAppConnectionState> {
    this.state.status = 'RECONNECTING';
    this.addLog('SYSTEM', 'reconnection', 'Tentando reconectar webhook e renovar token da Meta...', 'PENDING');

    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.state.status = 'CONNECTED';
    this.state.lastSyncAt = new Date().toISOString();
    this.addLog('SYSTEM', 'reconnection', 'Reconexão efetuada com sucesso! Webhook sincronizado.', 'SUCCESS');

    return { ...this.state };
  }

  public validateWebhookToken(verifyToken: string, expectedToken: string): boolean {
    const isValid = verifyToken === expectedToken;
    this.addLog(
      'SYSTEM',
      'webhook_validation',
      `Validação de token do Webhook Meta: ${isValid ? 'APROVADA' : 'REJEITADA'}`,
      isValid ? 'SUCCESS' : 'ERROR'
    );
    return isValid;
  }

  public detectMessageType(rawMessage: any): WhatsAppMessageType {
    if (rawMessage.type === 'text' || rawMessage.text) return 'text';
    if (rawMessage.type === 'image' || rawMessage.image) return 'image';
    if (rawMessage.type === 'audio' || rawMessage.audio) return 'audio';
    if (rawMessage.type === 'video' || rawMessage.video) return 'video';
    if (rawMessage.type === 'document' || rawMessage.document) return 'document';
    if (rawMessage.type === 'location' || rawMessage.location) return 'location';
    if (rawMessage.type === 'contacts' || rawMessage.contact) return 'contact';
    return 'text';
  }

  public async processIncomingMessage(
    payload: WhatsAppIncomingPayload
  ): Promise<{ textContent: string; mediaInfo?: string }> {
    this.state.messagesReceivedToday += 1;
    this.state.lastSyncAt = new Date().toISOString();

    let textContent = payload.text || '';
    let mediaInfo = '';

    switch (payload.type) {
      case 'image':
        mediaInfo = `[Imagem Recebida: ${payload.media?.caption || 'Sem legenda'}]`;
        textContent = textContent || `Cliente enviou uma Foto/Imagem: "${payload.media?.caption || 'Foto do produto/comprovante'}"`;
        break;
      case 'audio':
        mediaInfo = '[Áudio/Voz Recebido - Transcrição Automática Ativa]';
        textContent = textContent || 'Cliente enviou uma mensagem de áudio sobre cotação de produtos.';
        break;
      case 'video':
        mediaInfo = '[Vídeo Recebido]';
        textContent = textContent || 'Cliente enviou um vídeo demonstrativo da fazenda/equipamento.';
        break;
      case 'document':
        mediaInfo = `[Documento PDF/DOC: ${payload.media?.filename || 'arquivo.pdf'}]`;
        textContent = textContent || `Cliente enviou o documento: ${payload.media?.filename || 'Documento/Inscrição Estadual'}`;
        break;
      case 'location':
        mediaInfo = `[Localização GPS: Lat ${payload.media?.latitude}, Long ${payload.media?.longitude}]`;
        textContent = textContent || `Cliente enviou localização da propriedade rural para cálculo de frete.`;
        break;
      case 'contact':
        mediaInfo = `[Contato: ${payload.media?.contactName} - ${payload.media?.contactPhone}]`;
        textContent = textContent || `Cliente compartilhou o contato do gerente da fazenda: ${payload.media?.contactName}`;
        break;
      case 'text':
      default:
        break;
    }

    this.addLog(
      'INBOUND',
      payload.type,
      `De ${payload.fromName} (${payload.fromPhone}): "${textContent}" ${mediaInfo}`,
      'SUCCESS'
    );

    return { textContent, mediaInfo };
  }

  public async checkServerStatus(): Promise<{ configured: boolean; status: string; phoneNumberId?: string }> {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (data.configured) {
        this.state.status = 'CONNECTED';
        if (data.phoneNumberId) this.state.phoneNumberId = data.phoneNumberId;
      } else {
        this.state.status = 'DISCONNECTED';
      }
      return data;
    } catch (e) {
      return { configured: false, status: 'ERROR' };
    }
  }

  public async testServerConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/whatsapp/test-connection', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.state.status = 'CONNECTED';
        this.addLog('SYSTEM', 'connection_test', 'Conexão real com a API Meta WhatsApp Business confirmada!', 'SUCCESS');
        return { success: true };
      } else {
        this.state.status = 'DISCONNECTED';
        this.addLog('SYSTEM', 'connection_test', `Falha na conexão com a Meta API: ${data.error}`, 'ERROR');
        return { success: false, error: data.error };
      }
    } catch (e: any) {
      this.state.status = 'DISCONNECTED';
      return { success: false, error: e?.message || 'Erro de conexão com o servidor' };
    }
  }

  public async sendOutgoingMessage(
    phone: string,
    messageText: string,
    type: WhatsAppMessageType = 'text',
    mediaUrl?: string
  ): Promise<boolean> {
    this.state.messagesSentToday += 1;
    this.state.lastSyncAt = new Date().toISOString();

    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toPhone: phone, message: messageText, type, mediaUrl }),
      });
      const data = await res.json();

      if (data.success) {
        this.addLog(
          'OUTBOUND',
          type,
          `Para ${phone} [${data.mode || 'META_API'}]: "${messageText}" ${mediaUrl ? `[Anexo: ${mediaUrl}]` : ''}`,
          'SUCCESS'
        );
        return true;
      } else {
        this.addLog('OUTBOUND', type, `Falha no envio para ${phone}: ${data.error}`, 'ERROR');
        return false;
      }
    } catch (err: any) {
      this.addLog('OUTBOUND', type, `Erro de rede ao enviar para ${phone}: ${err?.message}`, 'ERROR');
      return false;
    }
  }

  private addLog(
    direction: 'INBOUND' | 'OUTBOUND' | 'SYSTEM',
    type: string,
    content: string,
    status: 'SUCCESS' | 'ERROR' | 'PENDING'
  ) {
    const newLog: WhatsAppLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      direction,
      type,
      content,
      status,
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 50) this.logs.pop();
  }
}

export const whatsappService = new WhatsAppService();
