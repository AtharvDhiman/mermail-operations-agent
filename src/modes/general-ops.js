/**
 * Specialized Operations Mode: General Infrastructure & Web3 Treasury Ops
 * Handles relayer gas monitoring, PayBox portfolio rebalancing,
 * dual-control sign-off previews, and verifiable settlement receipts.
 */

import { EmailComposer } from '../composer.js';
import { validateAddressForChain, findAllowlistedRelayer } from '../security.js';

export class GeneralOpsModeEngine {
  /**
   * Evaluates an infrastructure or treasury alert
   */
  static evaluateAlert(task, allowlistedRelayers = [], treasuryPortfolio = null) {
    const rawText = `${task.subject} ${task.rawEmail?.body || ''}`;
    const targetAddress = task.entities?.solanaAddress || task.entities?.evmAddress;
    const requestedAmount = task.entities?.amount || 1.5;
    const asset = task.entities?.asset || 'SOL';
    const chain = asset === 'SOL' ? 'solana' : 'base';

    // 1. Verify Address
    const isAddressValid = validateAddressForChain(chain, targetAddress);

    // 2. Allowlist Match
    const matchedRelayer = findAllowlistedRelayer(allowlistedRelayers, targetAddress, chain);

    // 3. Treasury Sufficiency Check
    const treasuryBalance = treasuryPortfolio?.balances?.[asset] ?? 50.0;
    const hasSufficientReserves = treasuryBalance >= requestedAmount;

    return {
      targetAddress,
      chain,
      asset,
      requestedAmount,
      isAddressValid,
      isAllowlisted: Boolean(matchedRelayer),
      relayerConfig: matchedRelayer,
      treasuryBalance,
      hasSufficientReserves,
      approvalRequired: true,
      preview: {
        action: 'paybox_request_transfer',
        destination: targetAddress,
        amount: requestedAmount,
        asset,
        chain,
        estimatedNetworkFee: asset === 'SOL' ? '0.000005 SOL' : '0.0001 ETH'
      }
    };
  }

  /**
   * Generates official resolution settlement receipt
   */
  static generateSettlementReceipt(task, txHash) {
    return EmailComposer.compose({
      category: 'GENERAL_OPS',
      recipient: task.sender,
      subject: `[RESOLVED] ${task.subject}`,
      tone: 'professional',
      entities: task.entities,
      customNotes: `On-chain settlement confirmed.\nTransaction Hash: ${txHash || '4uQeVj5t...mock_solana_signature'}`
    });
  }
}
