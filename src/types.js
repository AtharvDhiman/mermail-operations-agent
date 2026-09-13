/**
 * Mermail Autonomous Operations Agent - Core Data Types & Invariants
 */

export const AgentMode = {
  SUPPORT: 'SUPPORT',
  SALES_GTM: 'SALES_GTM',
  SCHEDULING: 'SCHEDULING',
  GENERAL_OPS: 'GENERAL_OPS'
};

export const WorkflowState = {
  RECEIVED: 'RECEIVED',
  CLASSIFIED: 'CLASSIFIED',
  CONTEXT_LOADED: 'CONTEXT_LOADED',
  PLANNED: 'PLANNED',
  SECURITY_CHECK: 'SECURITY_CHECK',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  WAITING_FOR_REPLY: 'WAITING_FOR_REPLY',
  FOLLOW_UP_REQUIRED: 'FOLLOW_UP_REQUIRED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  ESCALATED: 'ESCALATED',
  CANCELLED: 'CANCELLED'
};

export const ToolPermission = {
  READ_EMAIL: 'READ_EMAIL',
  DRAFT_EMAIL: 'DRAFT_EMAIL',
  SEND_EMAIL: 'SEND_EMAIL',
  SCHEDULE: 'SCHEDULE',
  CREATE_FOLLOWUP: 'CREATE_FOLLOWUP',
  PAYMENT: 'PAYMENT',
  BLOCKCHAIN_TRANSACTION: 'BLOCKCHAIN_TRANSACTION',
  TREASURY_OPERATION: 'TREASURY_OPERATION'
};

export const ToolRiskTier = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const UrgencyLevel = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const PriorityLevel = {
  P0: 'P0', // Critical, immediate attention
  P1: 'P1', // High priority
  P2: 'P2', // Standard priority
  P3: 'P3', // Low priority / backlog
  P4: 'P4'  // Informational / Digest / No-action
};

export const ActionRiskLevel = {
  SAFE: 'SAFE',
  HIGH_RISK: 'HIGH_RISK'
};

export const ApprovalStatus = {
  NONE_REQUIRED: 'NONE_REQUIRED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
};

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY',
  AUDIT: 'AUDIT'
};

// Backward compatibility with Sentinel
export const SentinelStatus = {
  IDLE: 'IDLE',
  SCANNING: 'SCANNING',
  ALERT_DETECTED: 'ALERT_DETECTED',
  ALLOWLIST_VERIFIED: 'ALLOWLIST_VERIFIED',
  TREASURY_CHECKED: 'TREASURY_CHECKED',
  AWAITING_OPERATOR_APPROVAL: 'AWAITING_OPERATOR_APPROVAL',
  SIGNING_PENDING: 'SIGNING_PENDING',
  SETTLED_ON_CHAIN: 'SETTLED_ON_CHAIN',
  REJECTED_SECURITY_VIOLATION: 'REJECTED_SECURITY_VIOLATION',
  REJECTED_OVER_CAP: 'REJECTED_OVER_CAP',
  CANCELLED: 'CANCELLED',
  ERROR: 'ERROR'
};

export const SupportedChains = {
  SOLANA: 'solana',
  BASE: 'base',
  ETHEREUM: 'ethereum'
};

export const SupportedTokens = {
  SOL: 'SOL',
  ETH: 'ETH',
  USDC: 'USDC'
};
