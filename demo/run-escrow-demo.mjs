#!/usr/bin/env node

/**
 * Mermail Agent Escrow & Arbitration Desk - Live Operational Protocol Demo
 * Demonstrates:
 * 1. Escrow Request Parsing & Deal ID Initialization
 * 2. Inbox-as-a-Database Thread Creation via send_mail
 * 3. PayBox Pre-flight & Custody Verification via get_paybox_connection
 * 4. Deliverable Intake & SHA-256 Checksumming
 * 5. Scenario A: Mutual Release via paybox_request_transfer
 * 6. Scenario B: Contested Dispute, Automated Evidence Scoring & Split Arbitration
 */

const isFast = process.argv.includes('--fast');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, isFast ? 10 : ms));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  gold: '\x1b[38;5;214m',
  cyan: '\x1b[38;5;45m',
  green: '\x1b[38;5;48m',
  purple: '\x1b[38;5;141m',
  red: '\x1b[38;5;203m',
  gray: '\x1b[38;5;244m'
};

function banner(title) {
  console.log('\n' + colors.gold + '═'.repeat(74) + colors.reset);
  console.log(` ${colors.bright}${colors.gold}${title}${colors.reset}`);
  console.log(colors.gold + '═'.repeat(74) + colors.reset);
}

function subheader(title) {
  console.log('\n' + colors.cyan + '▶ ' + colors.bright + title + colors.reset);
}

function toolLog(tool, params) {
  console.log(`  ${colors.purple}⚡ [MCP TOOL CALL]${colors.reset} ${colors.bright}${tool}${colors.reset}(${colors.gray}${JSON.stringify(params)}${colors.reset})`);
}

function ledgerLog(dealId, status, note) {
  console.log(`  ${colors.green}📬 [INBOX LEDGER]${colors.reset} ${colors.bright}${dealId}${colors.reset} ──► ${colors.gold}${status}${colors.reset} (${colors.dim}${note}${colors.reset})`);
}

export async function runEscrowDemo() {
  banner('MERMAIL AGENT ESCROW & ARBITRATION DESK — PROTOCOL DEMO');
  console.log(` ${colors.dim}Architecture: Multi-Agent Escrow • Inbox-as-Database • PayBox Custody • AI Arbitration${colors.reset}`);
  await sleep(600);

  // -------------------------------------------------------------
  // STAGE 1: INBOUND ESCROW REQUEST
  // -------------------------------------------------------------
  subheader('STAGE 1: Inbound Escrow Request & Parameter Validation');
  console.log(`  ${colors.gray}From: agent-buyer@mermail.app${colors.reset}`);
  console.log(`  ${colors.gray}To:   escrow-desk@mermail.app${colors.reset}`);
  console.log(`  ${colors.gray}Subj: [ESC-NEW] Sol-Commerce Market Intelligence Dataset (5,000 Records)${colors.reset}`);
  console.log(`  ${colors.dim}Terms: 50.00 USDC • Provider: agent-scraper@mermail.app • Deadline: 7 Days • Window: 48h${colors.reset}`);
  await sleep(500);

  console.log(`  ✓ Parameters validated: Amount within safety ceiling (50 <= 500 USDC)`);
  console.log(`  ✓ Assigned Deal ID: ${colors.bright}ESC-2026-001${colors.reset}`);
  await sleep(400);

  // -------------------------------------------------------------
  // STAGE 2: INBOX-AS-A-DATABASE SETUP
  // -------------------------------------------------------------
  subheader('STAGE 2: Inbox-as-a-Database Ledger Initialization');
  toolLog('send_mail', {
    to: ['agent-buyer@mermail.app', 'agent-scraper@mermail.app'],
    subject: '[ESC-2026-001] Escrow Contract Initialized: 50.00 USDC',
    state: 'INITIALIZED'
  });
  await sleep(400);
  ledgerLog('ESC-2026-001', 'INITIALIZED', 'Root deal thread established in Desk inbox');
  await sleep(500);

  // -------------------------------------------------------------
  // STAGE 3: AGENT WALLET (PAYBOX) CUSTODY DEPOSIT
  // -------------------------------------------------------------
  subheader('STAGE 3: PayBox Pre-Flight & Custody Verification');
  toolLog('get_paybox_connection', {});
  console.log(`  ✓ PayBox Status: ${colors.green}CONNECTED${colors.reset} (Agent Wallet: 4k3D...rkX6R | Network: Solana Mainnet)`);
  await sleep(400);

  console.log(`  ${colors.cyan}Incoming Transfer:${colors.reset} Payer deposited 50.00 USDC to Desk Custody (Tx: 4a9B...7xQ)`);
  toolLog('send_mail', {
    subject: '[ESC-2026-001] STATUS: FUNDED — Notice to Commence Work',
    threadId: 'ESC-2026-001'
  });
  ledgerLog('ESC-2026-001', 'FUNDED', '50.00 USDC locked in Agent Wallet custody');
  await sleep(600);

  // -------------------------------------------------------------
  // STAGE 4: DELIVERABLE INTAKE & MONITORING
  // -------------------------------------------------------------
  subheader('STAGE 4: Deliverable Intake & Timestamp Checksumming');
  console.log(`  ${colors.gray}Inbound from Provider: agent-scraper@mermail.app${colors.reset}`);
  console.log(`  ${colors.gray}Subj: [ESC-2026-001] DELIVERABLE: Sol-Commerce Dataset (5,000 Records)${colors.reset}`);
  toolLog('get_email', { emailId: 'msg_esc_001_deliv' });
  console.log(`  ✓ Attachment received: sol_merchants_5000.json (${colors.dim}SHA-256: e3b0c442...a98f${colors.reset})`);
  console.log(`  ✓ Delivery Timeliness: ${colors.green}ON TIME${colors.reset} (Delivered 3 days ahead of deadline)`);
  console.log(`  ✓ Started 48-Hour Dispute Countdown Window`);
  ledgerLog('ESC-2026-001', 'DELIVERED', 'Deliverable stored in thread; awaiting verification');
  await sleep(600);

  // -------------------------------------------------------------
  // STAGE 5: SCENARIO A — MUTUAL CONFIRMATION & INSTANT RELEASE
  // -------------------------------------------------------------
  subheader('STAGE 5: Scenario A — Mutual Confirmation & PayBox Settlement');
  console.log(`  ${colors.gray}Inbound from Payer: "Dataset verified against schema. Please release escrow funds."${colors.reset}`);
  console.log(`  ✓ Mutual confirmation verified from authenticated cryptographic senders.`);
  await sleep(300);

  toolLog('get_paybox_connection', {});
  toolLog('paybox_request_transfer', {
    recipient: 'agent-scraper@mermail.app',
    amount: '50.00',
    asset: 'USDC',
    chain: 'solana',
    memo: 'ESC-2026-001: Mutual Release'
  });
  console.log(`  ${colors.green}✓ PayBox Settlement Executed!${colors.reset} TxHash: 5k8G9z...2nZp (Solana Explorer verified)`);

  toolLog('send_mail', {
    subject: '[ESC-2026-001] STATUS: SETTLED — Payout Receipt Dispatched'
  });
  ledgerLog('ESC-2026-001', 'SETTLED_RELEASED', '100% funds released to Provider; contract closed');
  await sleep(700);

  // -------------------------------------------------------------
  // STAGE 6: SCENARIO B — CONTESTED DISPUTE & ARBITRATION
  // -------------------------------------------------------------
  subheader('STAGE 6: Scenario B — Contested Dispute & AI Arbitration Protocol');
  console.log(`  ${colors.dim}Simulating Deal ESC-2026-002: Anchor Smart Contract Escrow (100.00 USDC)${colors.reset}`);
  console.log(`  ${colors.red}⚠ Payer Lodged Dispute:${colors.reset} "Missing emergency_unstake instruction & compiler warning"`);
  await sleep(400);

  console.log(`  ✓ Dispute verified within active 48h window. State frozen: ${colors.red}IN_ARBITRATION${colors.reset}`);
  toolLog('send_mail', { subject: '[ESC-2026-002] NOTICE: Arbitration Initiated — Evidence Request (18h Window)' });
  ledgerLog('ESC-2026-002', 'IN_ARBITRATION', 'Escrow locked; collecting logs & commit history');
  await sleep(500);

  console.log(`\n  ${colors.bright}Executing Arbitration Decision Framework (references/arbitration-rules.md):${colors.reset}`);
  console.log(`  ├─ 1. Timeliness (25%):           25 / 25 pts (Delivered on schedule)`);
  console.log(`  ├─ 2. Interface Spec (25%):       25 / 25 pts (Valid Anchor workspace structure)`);
  console.log(`  ├─ 3. Functional Integrity (35%): 15 / 35 pts (Core passes; emergency instruction missing)`);
  console.log(`  └─ 4. Revisions/Doc (15%):        15 / 15 pts (Provider submitted clean patch in response)`);
  console.log(`  ─────────────────────────────────────────────────────────────`);
  console.log(`  ${colors.gold}TOTAL COMPLIANCE SCORE: 80 / 100 pts${colors.reset} ──► ${colors.bright}Outcome C: Pro-Rata Split (70/30)${colors.reset}`);
  await sleep(600);

  subheader('Arbitration Execution & Dual Settlement via PayBox');
  toolLog('paybox_request_transfer', {
    recipient: 'provider-dev@mermail.app',
    amount: '70.00',
    asset: 'USDC',
    memo: 'ESC-2026-002: Arbitration Award (70%)'
  });
  console.log(`  ✓ Disbursed 70.00 USDC to Provider (Tx: 9aL2...3pX)`);

  toolLog('paybox_request_transfer', {
    recipient: 'payer-client@mermail.app',
    amount: '30.00',
    asset: 'USDC',
    memo: 'ESC-2026-002: Arbitration Refund (30%)'
  });
  console.log(`  ✓ Refunded 30.00 USDC to Payer (Tx: 8bK1...4mY)`);

  toolLog('send_mail', { subject: '[ESC-2026-002] STATUS: SETTLED_SPLIT — Official Docket & Receipts' });
  ledgerLog('ESC-2026-002', 'SETTLED_SPLIT', 'Arbitration resolved; split payout executed');
  await sleep(600);

  // -------------------------------------------------------------
  // STAGE 7: INBOX-AS-A-DATABASE LEDGER SUMMARY
  // -------------------------------------------------------------
  banner('ESCROW INBOX-AS-A-DATABASE AUDIT LEDGER');
  toolLog('search_emails', { query: 'subject:ESC-' });
  console.log(`
┌──────────────┬─────────────────────────┬────────────┬───────────────────────────────────────┐
│ Deal ID      │ Counterparties          │ Escrow Val │ Final State                           │
├──────────────┼─────────────────────────┼────────────┼───────────────────────────────────────┤
│ ESC-2026-001 │ buyer / scraper         │  50.0 USDC │ ${colors.green}SETTLED_RELEASED (100% to Provider)${colors.reset}    │
│ ESC-2026-002 │ client / provider-dev   │ 100.0 USDC │ ${colors.gold}SETTLED_SPLIT (70% Prov / 30% Payer)${colors.reset}   │
└──────────────┴─────────────────────────┴────────────┴───────────────────────────────────────┘
  `);
  console.log(`${colors.bright}${colors.green}✓ Protocol Demonstration Complete.${colors.reset} All operations deterministic & cryptographically audited.\n`);
}

// Direct CLI invocation
if (process.argv[1]?.endsWith('run-escrow-demo.mjs')) {
  runEscrowDemo().catch(console.error);
}
