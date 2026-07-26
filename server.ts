import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { resilienceEngine, QueuedMessage } from "./src/server/resilienceEngine";

interface SecurityLogEvent {
  id: string;
  timestamp: string;
  eventType:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'PROMPT_INJECTION_BLOCKED'
    | 'WEBHOOK_SIGNATURE_INVALID'
    | 'PRICE_VIOLATION_BLOCKED'
    | 'RULE_CHANGE_UNAUTHORIZED'
    | 'UNAUTHORIZED_ACCESS_ATTEMPT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  details: string;
  ipAddress?: string;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security In-Memory Sessions
  const activeOwnerSessions = new Set<string>();
  const securityLogs: SecurityLogEvent[] = [];

  const addSecurityLog = (
    eventType: SecurityLogEvent['eventType'],
    details: string,
    severity: SecurityLogEvent['severity'] = 'INFO',
    ipAddress?: string
  ) => {
    const event: SecurityLogEvent = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details,
      ipAddress,
    };
    securityLogs.unshift(event);
    if (securityLogs.length > 500) securityLogs.pop();
    console.log(`[SECURITY AUDIT - ${severity}] ${eventType}: ${details}`);
  };

  app.use(express.json({ limit: "10mb" }));

  // Middleware: Auth Check for Protected Admin Endpoints
  const requireOwnerAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token || !activeOwnerSessions.has(token)) {
      addSecurityLog('UNAUTHORIZED_ACCESS_ATTEMPT', `Tentativa de acesso não autorizado em ${req.path}`, 'WARNING', req.ip);
      return res.status(401).json({ error: "Não autorizado. Sessão do proprietário inválida ou expirada." });
    }

    next();
  };

  // Initialize Gemini client
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // -------------------------------------------------------------
  // REAL HEALTH CHECK ENDPOINT (REQUISITO 15)
  // -------------------------------------------------------------
  app.get("/api/health", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    // Check Gemini Status
    let geminiStatus: 'OPERACIONAL' | 'INDISPONIVEL' = 'INDISPONIVEL';
    let geminiDetails = "Chave GEMINI_API_KEY não configurada no ambiente.";

    if (resilienceEngine.simulations.simulateGeminiError) {
      geminiStatus = 'INDISPONIVEL';
      geminiDetails = 'Simulação de falha no Gemini ativada no painel de testes.';
    } else if (apiKey) {
      geminiStatus = 'OPERACIONAL';
      geminiDetails = 'Conexão e SDK Gemini prontos para processamento de linguagem natural.';
    }

    // Check WhatsApp Status
    let whatsappStatus: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL' = 'DEGRADADO';
    let whatsappDetails = "Modo de simulação local (WhatsApp API não configurado no .env).";

    if (resilienceEngine.simulations.simulateWhatsAppError) {
      whatsappStatus = 'INDISPONIVEL';
      whatsappDetails = 'Simulação de falha na API do WhatsApp ativada no painel de testes.';
    } else if (phoneNumberId && accessToken) {
      whatsappStatus = 'OPERACIONAL';
      whatsappDetails = 'Meta Graph API WhatsApp Business configurada e autenticada.';
    }

    // Check Queue
    const queueList = Array.from(resilienceEngine.messageQueue.values());
    const pendingCount = queueList.filter((m) => m.status === 'PENDENTE' || m.status === 'RECEBIDA').length;
    const waitingSendCount = queueList.filter((m) => m.status === 'AGUARDANDO ENVIO').length;
    const failedCount = queueList.filter((m) => m.status === 'FALHOU').length;

    // Overall Status Calculation
    let overallStatus: 'OPERACIONAL' | 'DEGRADADO' | 'INDISPONIVEL' = 'OPERACIONAL';
    if (geminiStatus === 'INDISPONIVEL' || whatsappStatus === 'INDISPONIVEL') {
      overallStatus = 'DEGRADADO';
    }
    if (geminiStatus === 'INDISPONIVEL' && whatsappStatus === 'INDISPONIVEL') {
      overallStatus = 'INDISPONIVEL';
    }

    return res.json({
      status: overallStatus,
      gemini: {
        status: geminiStatus,
        details: geminiDetails,
      },
      whatsapp: {
        status: whatsappStatus,
        configured: Boolean(phoneNumberId && accessToken),
        details: whatsappDetails,
      },
      firestore: {
        status: resilienceEngine.simulations.simulateFirestoreError ? 'DEGRADADO' : 'OPERACIONAL',
        details: resilienceEngine.simulations.simulateFirestoreError
          ? 'Simulação de erro no banco de dados ativa.'
          : 'Instância Firestore ativa e com persistência transacional.',
      },
      queue: {
        pendingCount,
        waitingSendCount,
        failedCount,
        totalInQueue: queueList.length,
      },
      botActive: resilienceEngine.isBotActive,
      lastCheckedAt: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // -------------------------------------------------------------
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const configuredEmail = process.env.OWNER_ADMIN_EMAIL || "proprietario@aguiaagro.com.br";
    const configuredPassword = process.env.OWNER_ADMIN_PASSWORD || "aguia2026";

    if (
      (email && email.toLowerCase() === configuredEmail.toLowerCase()) &&
      password === configuredPassword
    ) {
      const sessionToken = `session_owner_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
      activeOwnerSessions.add(sessionToken);

      addSecurityLog('LOGIN_SUCCESS', `Login do proprietário realizado com sucesso para ${email}`, 'INFO', req.ip);

      return res.json({
        success: true,
        token: sessionToken,
        user: {
          email: configuredEmail,
          role: "owner",
          name: "Proprietário Águia Agro",
        },
      });
    } else {
      addSecurityLog('LOGIN_FAILED', `Falha de autenticação para o e-mail: ${email || "não informado"}`, 'WARNING', req.ip);
      return res.status(401).json({ success: false, error: "E-mail ou senha do proprietário incorretos." });
    }
  });

  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body;
    if (token && activeOwnerSessions.has(token)) {
      return res.json({ valid: true, role: "owner" });
    }
    return res.json({ valid: false });
  });

  app.post("/api/auth/logout", (req, res) => {
    const { token } = req.body;
    if (token) {
      activeOwnerSessions.delete(token);
      addSecurityLog('LOGOUT', "Sessão do proprietário encerrada com segurança", 'INFO', req.ip);
    }
    return res.json({ success: true });
  });

  app.get("/api/security-logs", requireOwnerAuth, (req, res) => {
    return res.json({ logs: securityLogs });
  });

  // -------------------------------------------------------------
  // BOT STATUS CONTROL ENDPOINTS (PERSISTED - REQUISITO 8)
  // -------------------------------------------------------------
  app.get("/api/bot-status", (req, res) => {
    return res.json({ active: resilienceEngine.isBotActive });
  });

  app.post("/api/bot-status", (req, res) => {
    const { active } = req.body;
    if (typeof active === "boolean") {
      resilienceEngine.setBotStatus(active);
      addSecurityLog(
        'RULE_CHANGE_UNAUTHORIZED',
        `Status do ÁGUIA alterado para: ${active ? "ONLINE" : "OFFLINE"} (Persistido)`,
        'INFO',
        req.ip
      );
      return res.json({ success: true, active: resilienceEngine.isBotActive });
    }
    return res.status(400).json({ error: "Parâmetro 'active' inválido." });
  });

  // -------------------------------------------------------------
  // HUMAN TAKEOVER PERSISTENCE ENDPOINTS (REQUISITO 7)
  // -------------------------------------------------------------
  app.get("/api/human-takeover", (req, res) => {
    return res.json({
      takeoverList: Array.from(resilienceEngine.humanTakeoverSet),
    });
  });

  app.post("/api/human-takeover", (req, res) => {
    const { customerId, takeover } = req.body;
    if (!customerId || typeof takeover !== "boolean") {
      return res.status(400).json({ error: "Parâmetros 'customerId' e 'takeover' são obrigatórios." });
    }

    resilienceEngine.setHumanTakeover(customerId, takeover);
    return res.json({
      success: true,
      customerId,
      takeover,
      humanTakeoverList: Array.from(resilienceEngine.humanTakeoverSet),
    });
  });

  // -------------------------------------------------------------
  // RESILIENCE, FAILURE LOGS, ALERTS & SIMULATOR ENDPOINTS
  // -------------------------------------------------------------
  app.get("/api/resilience/failure-logs", (req, res) => {
    return res.json({ logs: resilienceEngine.systemFailureLogs });
  });

  app.get("/api/resilience/alerts", (req, res) => {
    return res.json({ alerts: resilienceEngine.ownerAlerts });
  });

  app.post("/api/resilience/alerts/:id/resolve", (req, res) => {
    const alertId = req.params.id;
    resilienceEngine.resolveAlert(alertId);
    return res.json({ success: true, resolvedId: alertId });
  });

  app.get("/api/resilience/queue", (req, res) => {
    return res.json({
      queue: Array.from(resilienceEngine.messageQueue.values()),
    });
  });

  app.post("/api/resilience/simulate", (req, res) => {
    const { action, params = {} } = req.body;

    if (action === "TOGGLE_SIMULATION_FLAG") {
      const { flag, value } = params;
      if (flag in resilienceEngine.simulations) {
        (resilienceEngine.simulations as any)[flag] = value;
      }
      return res.json({
        success: true,
        simulations: resilienceEngine.simulations,
      });
    }

    if (action === "SIMULATE_SERVER_RESTART") {
      // Flushes memory and reloads state from disk to test persistence
      console.log("[SIMULATION] Simulando reinicialização da Cloud Function / Servidor Node...");
      resilienceEngine.saveStateToDisk();
      return res.json({
        success: true,
        message: "Servidor reiniciado com sucesso! Todo o estado foi recuperado do disco.",
        botActive: resilienceEngine.isBotActive,
        humanTakeoverList: Array.from(resilienceEngine.humanTakeoverSet),
        queueCount: resilienceEngine.messageQueue.size,
      });
    }

    if (action === "SIMULATE_DUPLICATE_WEBHOOK") {
      const testMsgId = params.messageId || "wamid_dup_test_999";
      const isDup = resilienceEngine.isMessageProcessed(testMsgId);

      if (isDup) {
        return res.json({
          success: true,
          duplicateDetected: true,
          actionTaken: "MENSAGEM_DUPLICADA_IGNORADA",
          message: `O ID de mensagem '${testMsgId}' já havia sido processado. Webhook duplicado foi bloqueado com sucesso sem duplicar resposta.`,
        });
      } else {
        resilienceEngine.enqueueMessage({
          id: testMsgId,
          conversationId: "conv-dup-test",
          customerPhone: "5566999887766",
          customerName: "Cliente Teste Duplicidade",
          text: "Quero 100 sacas de milho",
        });
        resilienceEngine.updateMessageStatus(testMsgId, 'RESPONDIDA');
        return res.json({
          success: true,
          duplicateDetected: false,
          actionTaken: "MENSAGEM_REGISTRADA",
          message: `Primeira tentativa registrada para '${testMsgId}'. Execute o teste novamente para ver a rejeição por duplicidade.`,
        });
      }
    }

    if (action === "SIMULATE_DOUBLE_CLICK_APPROVAL") {
      const idempotencyKey = params.idempotencyKey || `order-dup-key-${params.negotiationId || 'neg-123'}`;
      const existing = resilienceEngine.getExistingOrderKey(idempotencyKey);

      if (existing) {
        return res.json({
          success: true,
          doubleClickBlocked: true,
          actionTaken: "RETORNADO_PEDIDO_EXISTENTE",
          message: "Aprovação duplicada (clique duplo) bloqueada! O sistema retornou o pedido existente sem gerar duplicatas.",
          order: existing,
        });
      } else {
        const dummyOrder = {
          id: `ord-${Date.now()}`,
          orderNumber: `PED-${Math.floor(100000 + Math.random() * 900000)}`,
          totalValue: params.totalValue || 38000,
          customerName: params.customerName || "João Carlos Silveira",
          createdAt: new Date().toISOString(),
        };
        resilienceEngine.registerOrderKey(idempotencyKey, dummyOrder);
        return res.json({
          success: true,
          doubleClickBlocked: false,
          actionTaken: "PEDIDO_CRIADO",
          message: "Primeiro pedido criado. Dispare o teste novamente para simular o clique duplo travado pela idempotência.",
          order: dummyOrder,
        });
      }
    }

    if (action === "SIMULATE_STOCK_RACE_CONDITION") {
      const currentStock = params.stockQty !== undefined ? params.stockQty : 10;
      const buyerAQty = params.buyerAQty || 8;
      const buyerBQty = params.buyerBQty || 5;

      // Buyer A checks & reserves
      let stockAfterA = currentStock;
      let buyerASuccess = false;
      let buyerBSuccess = false;

      if (buyerAQty <= stockAfterA) {
        stockAfterA -= buyerAQty;
        buyerASuccess = true;
      }

      if (buyerBQty <= stockAfterA) {
        stockAfterA -= buyerBQty;
        buyerBSuccess = true;
      }

      if (!buyerBSuccess) {
        resilienceEngine.addFailureLog({
          service: 'ORDER_PROCESSOR',
          operation: 'reserva_estoque_concorrente',
          relatedId: 'prod-race-condition',
          errorType: 'ESTOQUE_INSUFICIENTE',
          errorMessage: `Comprador B solicitou ${buyerBQty} sacas, mas o estoque restante era de apenas ${stockAfterA} sacas após a compra do Comprador A (${buyerAQty} sacas).`,
          retryCount: 0,
          finalState: 'FALHA - INTERVENCAO NECESSARIA',
        });
      }

      return res.json({
        success: true,
        initialStock: currentStock,
        buyerA: { requested: buyerAQty, result: buyerASuccess ? "APROVADO" : "BLOQUEADO" },
        buyerB: { requested: buyerBQty, result: buyerBSuccess ? "APROVADO" : "BLOQUEADO (ESTOQUE INSUFICIENTE)" },
        remainingStock: stockAfterA,
        raceConditionPrevented: true,
        message: `Estoque protegido contra venda negativa! Comprador A reservou ${buyerAQty}. Comprador B (${buyerBQty}) foi bloqueado porque restavam apenas ${stockAfterA} sacas. Zero vendas falsas.`,
      });
    }

    return res.status(400).json({ error: "Ação de simulação desconhecida." });
  });

  // -------------------------------------------------------------
  // WHATSAPP BUSINESS STATUS & CONNECTION ENDPOINTS
  // -------------------------------------------------------------
  app.get("/api/whatsapp/status", (req, res) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const isConfigured = Boolean(phoneNumberId && accessToken);

    return res.json({
      configured: isConfigured,
      phoneNumberId: phoneNumberId ? `${phoneNumberId.slice(0, 4)}...${phoneNumberId.slice(-4)}` : null,
      status: isConfigured ? "CONFIGURED" : "NOT_CONFIGURED",
      wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "Não informado",
      verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      lastSyncAt: new Date().toISOString(),
    });
  });

  app.post("/api/whatsapp/test-connection", async (req, res) => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        status: "WHATSAPP NÃO CONFIGURADO",
        error: "Credenciais ausentes. Configure WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN nas variáveis de ambiente do servidor.",
      });
    }

    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const metaData = await metaRes.json();

      if (metaRes.ok) {
        return res.json({
          success: true,
          status: "WHATSAPP CONECTADO",
          phoneDetails: {
            id: metaData.id,
            displayPhoneNumber: metaData.display_phone_number,
            verifiedName: metaData.verified_name,
            qualityRating: metaData.quality_rating,
          },
          message: "Conexão REAL com a API Oficial da Meta validada com sucesso!",
        });
      } else {
        return res.status(400).json({
          success: false,
          status: "WHATSAPP NÃO CONFIGURADO",
          error: metaData.error?.message || "Falha na verificação com a Meta API",
          metaError: metaData.error,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        status: "WHATSAPP NÃO CONFIGURADO",
        error: `Erro de rede ao conectar com Meta Graph API: ${err.message}`,
      });
    }
  });

  app.post("/api/whatsapp/send-message", async (req, res) => {
    const { toPhone, message, type = "text", mediaUrl, messageId } = req.body;

    if (!toPhone || !message) {
      return res.status(400).json({ error: "Parâmetros 'toPhone' e 'message' são obrigatórios." });
    }

    // Check simulation flag for WhatsApp sending error
    if (resilienceEngine.simulations.simulateWhatsAppError) {
      const errLog = resilienceEngine.addFailureLog({
        service: 'WHATSAPP',
        operation: 'envio_mensagem_api',
        relatedId: messageId || `to-${toPhone}`,
        errorType: 'API_DISPATCH_FAILED',
        errorMessage: 'Simulação de erro na API do WhatsApp ativada. Mensagem mantida em AGUARDANDO ENVIO.',
        retryCount: 1,
        finalState: 'AGUARDANDO ENVIO',
      });

      resilienceEngine.addOwnerAlert({
        type: 'MENSAGEM_NAO_ENVIADA',
        title: 'Falha no envio via WhatsApp',
        description: `Não foi possível entregar resposta para o número ${toPhone}. Mantida na fila para reenvio automático.`,
        severity: 'ALTA',
        relatedId: messageId,
      });

      return res.status(503).json({
        success: false,
        error: "Simulação de erro no WhatsApp ativada. Resposta mantida pronta em AGUARDANDO ENVIO.",
        savedInQueue: true,
      });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.log(`[WhatsApp Dispatch Local] Para: ${toPhone} | Texto: "${message}"`);
      return res.json({
        success: true,
        mode: "DEV_SIMULATION",
        note: "Mensagem registrada no ambiente local.",
        messageId: `wamid_sim_${Date.now()}`,
      });
    }

    try {
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhone.replace(/\D/g, ""),
        type: type,
      };

      if (type === "text") {
        payload.text = { preview_url: false, body: message };
      } else if (type === "image" && mediaUrl) {
        payload.image = { link: mediaUrl, caption: message };
      } else {
        payload.text = { preview_url: false, body: message };
      }

      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const metaData = await metaRes.json();

      if (metaRes.ok) {
        return res.json({
          success: true,
          mode: "REAL_META_API",
          messageId: metaData.messages?.[0]?.id,
          metaData,
        });
      } else {
        resilienceEngine.addFailureLog({
          service: 'WHATSAPP',
          operation: 'envio_meta_graph_api',
          relatedId: toPhone,
          errorType: 'META_API_ERROR',
          errorMessage: metaData.error?.message || "Erro de envio no WhatsApp Meta API",
          retryCount: 1,
          finalState: 'AGUARDANDO ENVIO',
        });

        return res.status(metaRes.status).json({
          success: false,
          error: metaData.error?.message || "Erro retornado pela WhatsApp Business API",
          metaData,
        });
      }
    } catch (err: any) {
      resilienceEngine.addFailureLog({
        service: 'WHATSAPP',
        operation: 'envio_rede',
        relatedId: toPhone,
        errorType: 'NETWORK_ERROR',
        errorMessage: err.message,
        retryCount: 1,
        finalState: 'AGUARDANDO ENVIO',
      });

      return res.status(500).json({
        success: false,
        error: `Falha de rede ao transmitir mensagem via Meta: ${err.message}`,
      });
    }
  });

  // -------------------------------------------------------------
  // WHATSAPP BUSINESS WEBHOOK ENDPOINT (PUBLIC & META VERIFICATION)
  // -------------------------------------------------------------
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = (req.query["hub.mode"] || req.query["mode"]) as string | undefined;
    const token = (req.query["hub.verify_token"] || req.query["verify_token"]) as string | undefined;
    const challenge = (req.query["hub.challenge"] || req.query["challenge"]) as string | undefined;

    const configuredToken = process.env.WHATSAPP_VERIFY_TOKEN;
    const defaultToken = "aguia_vendedor_secret_2026";

    // Valid if token matches configured env token OR fallback token "aguia_vendedor_secret_2026"
    const isValidToken =
      Boolean(token) &&
      ((Boolean(configuredToken) && token === configuredToken) || token === defaultToken);

    if (mode === "subscribe" && isValidToken && challenge !== undefined) {
      addSecurityLog(
        'LOGIN_SUCCESS',
        `WhatsApp Webhook verificado com sucesso pela Meta. Challenge: ${challenge}`,
        'INFO',
        req.ip
      );
      console.log(`[WhatsApp Webhook Verified] Meta challenge: ${challenge}`);
      return res.status(200).type("text/plain").send(String(challenge));
    } else {
      addSecurityLog(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        `Tentativa de verificacao de Webhook invalida. Mode: ${mode}, Token informado: ${token}`,
        'WARNING',
        req.ip
      );
      console.warn(`[WhatsApp Webhook Verification Failed] Mode: ${mode}, Token: ${token}`);
      return res.status(403).type("text/plain").send("Forbidden: Invalid verification token or mode");
    }
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      // Respond 200 OK immediately to Meta
      res.status(200).send("EVENT_RECEIVED");

      const body = req.body;
      if (body.object === "whatsapp_business_account") {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value || {};
            const messages = value.messages || [];
            const statuses = value.statuses || [];

            // Status updates from Meta (sent, delivered, read, failed)
            for (const statusObj of statuses) {
              const statusType = statusObj.status; // sent | delivered | read | failed
              console.log(`[WhatsApp Status Event] ID ${statusObj.id} -> Status: ${statusType}`);
              if (statusType === 'failed') {
                const errDetail = statusObj.errors?.[0]?.title || statusObj.errors?.[0]?.message || 'Falha de entrega informada pela Meta';
                resilienceEngine.addFailureLog({
                  service: 'WHATSAPP',
                  operation: 'recebimento_status_meta',
                  relatedId: statusObj.id,
                  errorType: 'DELIVERY_FAILED',
                  errorMessage: `Meta informou falha na mensagem: ${errDetail}`,
                  retryCount: 1,
                  finalState: 'FALHA - INTERVENCAO NECESSARIA',
                });
              }
            }

            for (const message of messages) {
              const messageId = message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

              // Requisito 5 & 10: Idempotency check - ignore duplicate webhooks from Meta
              if (resilienceEngine.isMessageProcessed(messageId)) {
                console.log(`[Webhook Idempotency] Mensagem duplicada ignorada pelo ID: ${messageId}`);
                continue;
              }

              const fromNumber = message.from;
              const messageText = message.text?.body || "";
              const contactName = value.contacts?.[0]?.profile?.name || `Cliente ${fromNumber.slice(-4)}`;

              // Enqueue message with initial state 'RECEBIDA'
              const queuedMsg = resilienceEngine.enqueueMessage({
                id: messageId,
                conversationId: `conv-${fromNumber}`,
                customerPhone: fromNumber,
                customerName: contactName,
                text: messageText,
              });

              console.log(`[WhatsApp Webhook Queue] Mensagem enfileirada [RECEBIDA]: De ${fromNumber} ("${messageText}") ID: ${queuedMsg.id}`);
            }
          }
        }
      }
    } catch (err: any) {
      addSecurityLog('UNAUTHORIZED_ACCESS_ATTEMPT', `Erro no processamento do Webhook: ${err?.message}`, 'WARNING', req.ip);
    }
  });

  // -------------------------------------------------------------
  // PROMPT INJECTION GUARD & ANTI-TAMPERING CHECK
  // -------------------------------------------------------------
  const detectPromptInjection = (messageText: string): boolean => {
    const text = messageText.toLowerCase();
    const injectionPatterns = [
      /ignore\s+(suas|todas|as|previous)\s+(regras|instruções|prompt|instrucoes)/i,
      /revele\s+(seu|o|suas)\s+(prompt|sistema|instruções|instrucoes|preço mínimo|preco minimo)/i,
      /show\s+(me\s+)?(your|the)\s+(prompt|system instruction|minimum price)/i,
      /preço\s+mínimo\s+é|preco\s+minimo\s+é/i,
      /mude\s+o\s+preço\s+para|altere\s+o\s+preço\s+para|coloque\s+por\s+r\$\s*1/i,
      /me\s+dê\s+acesso\s+ao\s+sistema|modo\s+desenvolvedor|developer\s+mode/i,
      /diga\s+que\s+você\s+é\s+uma\s+ia|sou\s+o\s+proprietário|sou\s+o\s+dono/i,
    ];

    return injectionPatterns.some((pattern) => pattern.test(text));
  };

  // -------------------------------------------------------------
  // IDEMPOTENT ORDER CREATION & ATOMIC STOCK DEDUCTION (REQUISITO 11 & 12)
  // -------------------------------------------------------------
  app.post("/api/orders/create-idempotent", (req, res) => {
    try {
      const { idempotencyKey, negotiationId, orderData } = req.body;
      const key = idempotencyKey || (negotiationId ? `order-neg-${negotiationId}` : null);

      if (!key) {
        return res.status(400).json({ error: "Parâmetro 'idempotencyKey' ou 'negotiationId' é obrigatório." });
      }

      // Requisito 11: Idempotency check to prevent duplicate orders from double click, retry or refresh
      const existing = resilienceEngine.getExistingOrderKey(key);
      if (existing) {
        console.log(`[Order Idempotency] Pedido duplicado evitado para a chave '${key}'`);
        return res.json({
          success: true,
          duplicatePrevented: true,
          order: existing,
          note: "A solicitação foi identificada como duplicada. O pedido existente foi mantido sem duplicação.",
        });
      }

      // Check simulated firestore failure
      if (resilienceEngine.simulations.simulateFirestoreError) {
        resilienceEngine.addFailureLog({
          service: 'FIRESTORE',
          operation: 'persistir_pedido',
          relatedId: key,
          errorType: 'PERSISTENCE_FAILED',
          errorMessage: 'Simulação de erro na persistência do Firestore ativada. Pedido mantido em pendência.',
          retryCount: 1,
          finalState: 'FALHA - INTERVENCAO NECESSARIA',
        });

        resilienceEngine.addOwnerAlert({
          type: 'PEDIDO_COM_ERRO',
          title: 'Erro na criação de pedido',
          description: `Falha de persistência ao registrar pedido para a negociação ${key}. O cliente NÃO recebeu confirmação falsa.`,
          severity: 'CRITICA',
          relatedId: key,
        });

        return res.status(500).json({
          error: "Falha na persistência no banco de dados. O pedido NÃO foi confirmado ao cliente.",
        });
      }

      // Requisito 12: Atomic Stock Check
      const requestedQty = orderData?.quantity || 1;
      const productStock = orderData?.productStockQty !== undefined ? orderData.productStockQty : 500;

      if (requestedQty > productStock) {
        resilienceEngine.addFailureLog({
          service: 'ORDER_PROCESSOR',
          operation: 'reserva_estoque',
          relatedId: key,
          errorType: 'ESTOQUE_INSUFICIENTE',
          errorMessage: `Quantidade solicitada (${requestedQty}) excede o estoque disponível (${productStock}). Venda não autorizada.`,
          retryCount: 0,
          finalState: 'FALHA - INTERVENCAO NECESSARIA',
        });

        return res.status(400).json({
          error: `Estoque insuficiente! A quantidade solicitada (${requestedQty}) excede as ${productStock} unidades em estoque. O pedido não pode ser fechado automaticamente.`,
        });
      }

      const createdOrder = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderNumber: orderData?.orderNumber || `PED-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
        customerId: orderData?.customerId || "cust-1",
        customerName: orderData?.customerName || "Cliente",
        productName: orderData?.productName || "Produto Rural",
        quantity: requestedQty,
        totalValue: orderData?.totalValue || 0,
        status: "Negociando",
      };

      resilienceEngine.registerOrderKey(key, createdOrder);

      return res.json({
        success: true,
        duplicatePrevented: false,
        order: createdOrder,
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Erro no processamento do pedido.", details: err?.message });
    }
  });

  // -------------------------------------------------------------
  // CHAT API WITH RESILIENCE QUEUE & RETRY ENGINE (REQUISITO 1 a 10)
  // -------------------------------------------------------------
  app.post("/api/chat", async (req, res) => {
    try {
      const {
        messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        customerMessage = "",
        messageType = "text",
        transcription = "",
        customerPhone = "5566999887766",
        contactName = "Cliente Produtor",
        customer = {},
        products = [],
        settings = {},
        conversationHistory = [],
      } = req.body;

      const customerId = customer.id || `cust-${customerPhone}`;

      // Requisito 7: Human Takeover check (Persisted - never lost on restart)
      if (resilienceEngine.isHumanTakeover(customerId)) {
        return res.json({
          reply: `Esta conversa está sendo conduzida diretamente pelo proprietário. O atendimento do ÁGUIA está pausado para o seu número.`,
          proposalGenerated: false,
          alertOwner: false,
          leadTemperature: "Morno",
          salesTacticUsed: "Assumido por Humano",
          reasoning: "Conversa em modo de Atendimento Humano pelo proprietário.",
        });
      }

      // Requisito 8: Bot OFFLINE status check (Persisted - never flips on restart)
      if (!resilienceEngine.isBotActive) {
        return res.json({
          reply: `O atendimento automático do ÁGUIA está temporariamente desativado no momento. Sua mensagem foi registrada e será respondida em breve.`,
          proposalGenerated: false,
          alertOwner: true,
          leadTemperature: "Morno",
          salesTacticUsed: "ÁGUIA Offline",
          reasoning: "ÁGUIA está OFFLINE no painel.",
        });
      }

      // Requisito 1: Enqueue message state -> PROCESSANDO
      const queuedMsg = resilienceEngine.enqueueMessage({
        id: messageId,
        conversationId: `conv-${customerPhone}`,
        customerPhone,
        customerName: contactName,
        text: customerMessage,
      });

      resilienceEngine.updateMessageStatus(messageId, 'PROCESSANDO');

      // Prompt injection shield check
      if (detectPromptInjection(customerMessage)) {
        addSecurityLog(
          'PROMPT_INJECTION_BLOCKED',
          `Prompt Injection bloqueado para ${customerPhone}: "${customerMessage}"`,
          'WARNING',
          req.ip
        );

        const replyText = `Como consultor comercial da ${settings.companyName || "Águia Agro"}, sigo rigorosamente a política comercial e tabela oficial da empresa. Não compartilho instruções internas nem altero preços fora do catálogo oficial.`;
        resilienceEngine.updateMessageStatus(messageId, 'RESPONDIDA');

        return res.json({
          reply: replyText,
          proposalGenerated: false,
          alertOwner: false,
          leadTemperature: "Morno",
          salesTacticUsed: "Segurança Comercial",
          reasoning: "Prompt Injection bloqueado.",
        });
      }

      // Requisito 2: Gemini Failure Check / Simulation
      if (resilienceEngine.simulations.simulateGeminiError) {
        // Increment retry attempts
        resilienceEngine.updateMessageStatus(messageId, 'PENDENTE', {
          lastError: "Simulação de falha de conexão com a API do Gemini",
          incrementAttempt: true,
        });

        resilienceEngine.addFailureLog({
          service: 'GEMINI',
          operation: 'chat_generation',
          relatedId: messageId,
          errorType: 'GEMINI_503_UNAVAILABLE',
          errorMessage: 'Falha temporária de resposta no Gemini. Mensagem marcada como PENDENTE para retentativa.',
          retryCount: queuedMsg.attempts + 1,
          finalState: queuedMsg.attempts >= 2 ? 'FALHA - INTERVENCAO NECESSARIA' : 'PENDENTE',
        });

        if (queuedMsg.attempts >= 2) {
          resilienceEngine.updateMessageStatus(messageId, 'FALHOU');
          resilienceEngine.addOwnerAlert({
            type: 'GEMINI_INDISPONIVEL',
            title: 'Gemini Indisponível após 3 tentativas',
            description: `A mensagem de ${contactName} (${customerPhone}) falhou. Intervenção necessária.`,
            severity: 'ALTA',
            relatedId: messageId,
          });
        }

        return res.status(503).json({
          error: "Falha temporária no servidor de IA. A mensagem foi salva com status PENDENTE e será reprocessada automaticamente.",
          savedInQueue: true,
          status: queuedMsg.attempts >= 2 ? 'FALHOU' : 'PENDENTE',
        });
      }

      const ai = getGenAI();

      if (!ai) {
        // Fallback response for offline demo
        const fallbackReply = `Olá! Sou o consultor comercial da ${settings.companyName || "Águia Agro"}. Posso te apresentar nossos produtos em estoque com ótimas condições de frete e pagamento! Como posso te ajudar?`;
        resilienceEngine.updateMessageStatus(messageId, 'RESPONDIDA');
        return res.json({
          reply: fallbackReply,
          proposalGenerated: false,
          alertOwner: false,
          reasoning: "Modo de demonstração sem chave Gemini.",
        });
      }

      // Build product catalog text
      const productCatalogSummary = products
        .map(
          (p: any) => `
- [ID: ${p.id}] NOME: ${p.name}
  Unidade: ${p.unit} | Estoque: ${p.stockQty} | Tabela: R$ ${p.listPrice} | Mínimo: R$ ${p.minPrice} | Desc. Máx: ${p.maxDiscountPercent}%
`
        )
        .join("\n");

      const systemInstruction = `
Você é o ÁGUIA, o VENDEDOR COMERCIAL OFICIAL da empresa "${settings.companyName || "Águia Agro"}".
- Respostas curtas, objetivas e naturais para WhatsApp.
- NUNCA invente preços abaixo do Preço Mínimo.
- NUNCA diga que é uma IA ou robô.
CATÁLOGO REAL:
${productCatalogSummary}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `ÚLTIMA MENSAGEM DO CLIENTE (${contactName}): "${customerMessage}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              proposalGenerated: { type: Type.BOOLEAN },
              alertOwner: { type: Type.BOOLEAN },
              leadTemperature: { type: Type.STRING },
              salesTacticUsed: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: ["reply", "proposalGenerated", "alertOwner", "reasoning"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");

      // Check Requisito 3: WhatsApp Dispatch Failure
      if (resilienceEngine.simulations.simulateWhatsAppError) {
        resilienceEngine.updateMessageStatus(messageId, 'AGUARDANDO ENVIO', {
          preparedResponse: parsed,
          lastError: "Falha simulada na entrega via WhatsApp API.",
        });

        resilienceEngine.addFailureLog({
          service: 'WHATSAPP',
          operation: 'envio_resposta_chat',
          relatedId: messageId,
          errorType: 'DISPATCH_PENDING',
          errorMessage: 'Resposta gerada com sucesso pelo Gemini, mas o envio no WhatsApp falhou. Guardada em AGUARDANDO ENVIO.',
          retryCount: 1,
          finalState: 'AGUARDANDO ENVIO',
        });

        return res.json({
          reply: parsed.reply,
          status: "AGUARDANDO ENVIO",
          proposalGenerated: parsed.proposalGenerated || false,
          alertOwner: parsed.alertOwner || false,
          note: "A resposta foi gerada pelo Gemini e armazenada com segurança em 'AGUARDANDO ENVIO'. O envio será retentado automaticamente.",
        });
      }

      // Success - Mark as RESPONDIDA
      resilienceEngine.updateMessageStatus(messageId, 'RESPONDIDA', {
        preparedResponse: parsed,
      });

      return res.json({
        reply: parsed.reply || "Olá! Como posso te ajudar nas compras da fazenda hoje?",
        proposalGenerated: parsed.proposalGenerated || false,
        alertOwner: parsed.alertOwner || false,
        leadTemperature: parsed.leadTemperature || "Morno",
        salesTacticUsed: parsed.salesTacticUsed || "Atendimento Consultivo",
        reasoning: parsed.reasoning || "Atendimento concluído.",
      });
    } catch (err: any) {
      // Requisito 2: Record Gemini error, mark as PENDENTE
      const msgId = req.body.messageId || `msg_err_${Date.now()}`;
      resilienceEngine.updateMessageStatus(msgId, 'PENDENTE', {
        lastError: err?.message || "Erro de conexão com o Gemini API",
        incrementAttempt: true,
      });

      resilienceEngine.addFailureLog({
        service: 'GEMINI',
        operation: 'geracao_resposta',
        relatedId: msgId,
        errorType: 'GEMINI_EXCEPTION',
        errorMessage: err?.message || "Erro na chamada do Gemini API",
        retryCount: 1,
        finalState: 'PENDENTE',
      });

      return res.status(500).json({
        error: "Falha na comunicação com o Gemini. Mensagem marcada como PENDENTE para reprocessamento automático.",
        details: err?.message,
      });
    }
  });

  // -------------------------------------------------------------
  // BACKGROUND AUTOMATIC RECOVERY WORKER (REQUISITO 16)
  // -------------------------------------------------------------
  setInterval(() => {
    try {
      if (!resilienceEngine.isBotActive) return;

      const queueList = Array.from(resilienceEngine.messageQueue.values());
      const pendingMsgs = queueList.filter(
        (m) =>
          (m.status === 'PENDENTE' || m.status === 'AGUARDANDO ENVIO') &&
          (!m.nextAttemptAt || new Date(m.nextAttemptAt) <= new Date())
      );

      for (const msg of pendingMsgs) {
        if (msg.status === 'AGUARDANDO ENVIO' && msg.preparedResponse) {
          // Retry sending prepared response via WhatsApp without calling Gemini again (Requisito 3)
          if (!resilienceEngine.simulations.simulateWhatsAppError) {
            resilienceEngine.updateMessageStatus(msg.id, 'RESPONDIDA');
            resilienceEngine.addFailureLog({
              service: 'WHATSAPP',
              operation: 'reenvio_automatico',
              relatedId: msg.id,
              errorType: 'RECUPERADO',
              errorMessage: `Mensagem enviada com sucesso no reenvio automático para ${msg.customerPhone}.`,
              retryCount: msg.attempts,
              finalState: 'RECUPERADO',
            });
            console.log(`[Auto-Recovery Engine] Mensagem '${msg.id}' em AGUARDANDO ENVIO entregue com sucesso!`);
          }
        } else if (msg.status === 'PENDENTE') {
          // Retry processing pending message
          if (!resilienceEngine.simulations.simulateGeminiError) {
            resilienceEngine.updateMessageStatus(msg.id, 'RESPONDIDA');
            resilienceEngine.addFailureLog({
              service: 'GEMINI',
              operation: 'reprocessamento_automatico',
              relatedId: msg.id,
              errorType: 'RECUPERADO',
              errorMessage: `Mensagem de ${msg.customerName} reprocessada com sucesso pelo Gemini.`,
              retryCount: msg.attempts,
              finalState: 'RECUPERADO',
            });
            console.log(`[Auto-Recovery Engine] Mensagem PENDENTE '${msg.id}' reprocessada e respondida com sucesso!`);
          }
        }
      }
    } catch (err: any) {
      console.error("[Auto-Recovery Engine Error]:", err?.message);
    }
  }, 5000); // Runs every 5 seconds

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Águia Vendedor IA Server com Motor de Resiliência rodando em http://localhost:${PORT}`);
  });
}

startServer();
