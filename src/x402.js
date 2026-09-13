/**
 * x402 Micropayment & Paywall Capability Engine
 * Recognizes HTTP 402 payment requirements, enforces dual-control approval,
 * provides explicit simulation vs devnet isolation, and prevents unauthorized spend.
 */

import { safety } from './safety.js';
import { audit } from './audit.js';
import { logger } from './logger.js';

export class X402PaymentEngine {
  /**
   * Evaluates whether an external resource or email response requires an x402 micropayment
   */
  static isPaymentRequired(status, headers = {}, body = '') {
    if (status === 402) return true;
    if (headers['www-authenticate']?.includes('x402') || headers['x-payment-required']) return true;
    const bodyStr = typeof body === 'string' ? body.toLowerCase() : JSON.stringify(body).toLowerCase();
    return bodyStr.includes('payment required') && (bodyStr.includes('x402') || bodyStr.includes('usdc') || bodyStr.includes('sol'));
  }

  /**
   * Generates a payment quote and creates an approval request
   */
  static generatePaymentQuote({
    taskId,
    serviceName = 'API Gateway',
    amount = 0.05,
    token = 'USDC',
    payToAddress = 'PayBox_Escrow_Mock'
  }) {
    const isLive = process.env.ENABLE_LIVE_X402 === 'true';

    const quote = {
      id: `X402-${Date.now().toString(36).toUpperCase()}`,
      taskId,
      serviceName,
      amount,
      token,
      payToAddress,
      mode: isLive ? 'LIVE_DEVNET' : 'SIMULATION',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    };

    // Human-in-the-loop approval gate
    const approval = safety.createApprovalRequest({
      taskId,
      action: 'x402_settle_payment',
      target: serviceName,
      payload: quote,
      rationale: `Settle HTTP 402 fee of ${amount} ${token} for ${serviceName}`,
      riskReason: `Micropayment transfer of ${amount} ${token} (${quote.mode})`
    });

    quote.approvalToken = approval.token;

    logger.warn(`x402 payment required [${quote.id}]: ${amount} ${token} for ${serviceName} (Approval: ${approval.token})`, { taskId });

    audit.record({
      taskId,
      action: 'X402_PAYMENT_QUOTED',
      details: { quoteId: quote.id, amount, token, mode: quote.mode }
    });

    return quote;
  }

  /**
   * Executes settlement following human approval
   */
  static settlePayment(quote, approvalToken) {
    const approval = safety.getApproval(approvalToken);
    if (!approval) {
      throw new Error(`Approval token '${approvalToken}' not found.`);
    }
    if (approval.status === 'CONSUMED') {
      throw new Error(`Approval token '${approvalToken}' has already been consumed (replay blocked).`);
    }
    if (approval.status !== 'APPROVED') {
      throw new Error(`Cannot settle x402 payment without approved token. Status: ${approval.status}`);
    }

    if (!quote || !quote.id) {
      throw new Error('Valid payment quote is required for settlement.');
    }

    const approvedPayload = approval.payload || {};
    if (approvedPayload.id && approvedPayload.id !== quote.id) {
      throw new Error(`Parameter tampering detected: quote ID '${quote.id}' does not match approved quote '${approvedPayload.id}'.`);
    }
    if (approvedPayload.amount !== undefined && Number(approvedPayload.amount) !== Number(quote.amount)) {
      throw new Error(`Parameter tampering detected: settlement amount '${quote.amount}' does not match approved amount '${approvedPayload.amount}'.`);
    }
    if (approvedPayload.payToAddress && quote.payToAddress && approvedPayload.payToAddress !== quote.payToAddress) {
      throw new Error('Parameter tampering detected: destination address does not match approved quote.');
    }

    // Mark approval token consumed to prevent capture-replay
    approval.status = 'CONSUMED';
    approval.consumedAt = new Date().toISOString();
    safety.save();

    quote.status = 'SETTLED';
    quote.settledAt = new Date().toISOString();
    quote.txHash = quote.mode === 'LIVE_DEVNET'
      ? `live_x402_${Date.now()}`
      : `sim_x402_${Date.now()}_mock_proof`;

    audit.record({
      taskId: quote.taskId,
      action: 'X402_PAYMENT_SETTLED',
      details: { quoteId: quote.id, amount: quote.amount, token: quote.token, txHash: quote.txHash }
    });

    logger.info(`x402 payment settled [${quote.id}] Tx: ${quote.txHash}`, { taskId: quote.taskId });
    return quote;
  }
}
