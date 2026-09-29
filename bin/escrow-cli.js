#!/usr/bin/env node

/**
 * Mermail Agent Escrow & Arbitration Desk — CLI & Terminal Shell
 *
 * Can be run in:
 * 1. Interactive Shell / REPL mode: node bin/escrow-cli.js interactive (or just node bin/escrow-cli.js)
 * 2. Headless Bash one-liners: node bin/escrow-cli.js <command> [args]
 */

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { escrowDesk, ESCROW_STATES } from '../src/escrow-desk.js';
import { runEscrowDemo } from '../demo/run-escrow-demo.mjs';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  gold: '\x1b[38;5;214m',
  cyan: '\x1b[38;5;45m',
  green: '\x1b[38;5;48m',
  purple: '\x1b[38;5;141m',
  red: '\x1b[38;5;203m',
  gray: '\x1b[38;5;244m',
  white: '\x1b[37m'
};

function banner() {
  console.log('\n' + colors.gold + '╔════════════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.gold + '║' + colors.bright + '  MERMAIL AGENT ESCROW & ARBITRATION DESK — CLI & BASH SHELL           ' + colors.gold + '║' + colors.reset);
  console.log(colors.gold + '║' + colors.dim + '  Inbox-as-Database • PayBox Agent Wallet Custody • AI Arbitration Rubric' + colors.gold + '║' + colors.reset);
  console.log(colors.gold + '╚════════════════════════════════════════════════════════════════════════╝' + colors.reset);
}

function showHelp() {
  console.log(`
${colors.bright}AVAILABLE COMMANDS:${colors.reset}

  ${colors.cyan}list${colors.reset}                              List all escrow deals in Inbox Database
  ${colors.cyan}status <dealId>${colors.reset}                  Inspect complete thread, deliverable hash, & PayBox state
  ${colors.cyan}create [options]${colors.reset}                 Create a new escrow deal & initialize email thread
                                     Options: --buyer <email> --provider <email> --amount <num> --title <str>
  ${colors.cyan}fund <dealId>${colors.reset}                    Simulate PayBox lock of funds into Agent Wallet custody
  ${colors.cyan}deliver <dealId> [file]${colors.reset}          Submit deliverable, record SHA-256, & start dispute countdown
  ${colors.cyan}release <dealId>${colors.reset}                 Confirm acceptance & release PayBox settlement to provider
  ${colors.cyan}dispute <dealId> <reason>${colors.reset}        Freeze funds & initiate AI Arbitration Protocol
  ${colors.cyan}arbitrate <dealId>${colors.reset}               Run 4-factor scoring rubric & execute split settlement
  ${colors.cyan}search <query>${colors.reset}                   Search emails across all escrow deal threads
  ${colors.cyan}demo${colors.reset}                             Run the end-to-end multi-agent protocol demo
  ${colors.cyan}help${colors.reset}                             Show this command cheat sheet
  ${colors.cyan}clear${colors.reset}                            Clear the terminal screen
  ${colors.cyan}exit / quit${colors.reset}                      Exit the interactive shell
`);
}

function renderTable(deals) {
  if (deals.length === 0) {
    console.log(`  ${colors.dim}No escrow deals found in Inbox Database.${colors.reset}`);
    return;
  }

  console.log(`
┌──────────────┬────────────────────────┬─────────────┬──────────────┬────────────────────────┐
│ Deal ID      │ Buyer / Provider       │ Amount      │ Chain / Asset│ State                  │
├──────────────┼────────────────────────┼─────────────┼──────────────┼────────────────────────┤`);

  for (const d of deals) {
    const id = d.dealId.padEnd(12);
    const parties = `${d.buyer.split('@')[0]} -> ${d.provider.split('@')[0]}`.slice(0, 22).padEnd(22);
    const amt = `${d.amount} ${d.asset}`.padEnd(11);
    const chain = `${d.chain || 'solana'}`.padEnd(12);
    let stateColor = colors.white;
    if (d.state.startsWith('SETTLED')) stateColor = colors.green;
    else if (d.state === 'IN_ARBITRATION') stateColor = colors.red;
    else if (d.state === 'FUNDED' || d.state === 'DELIVERED') stateColor = colors.cyan;

    const stateStr = `${stateColor}${d.state.padEnd(22)}${colors.reset}`;
    console.log(`│ ${id} │ ${parties} │ ${amt} │ ${chain} │ ${stateStr} │`);
  }
  console.log(`└──────────────┴────────────────────────┴─────────────┴──────────────┴────────────────────────┘`);
}

function formatStatus(deal) {
  if (!deal) {
    console.log(`${colors.red}Error: Deal not found.${colors.reset}`);
    return;
  }

  console.log('\n' + colors.cyan + '═'.repeat(68) + colors.reset);
  console.log(` ${colors.bright}ESCROW DEAL RECORD: ${colors.gold}${deal.dealId}${colors.reset}`);
  console.log(colors.cyan + '═'.repeat(68) + colors.reset);
  console.log(`  ${colors.dim}Title:${colors.reset}         ${deal.title}`);
  console.log(`  ${colors.dim}Status:${colors.reset}        ${colors.bright}${deal.state}${colors.reset}`);
  console.log(`  ${colors.dim}Amount:${colors.reset}        ${deal.amount} ${deal.asset} (${deal.chain})`);
  console.log(`  ${colors.dim}Buyer:${colors.reset}         ${deal.buyer}`);
  console.log(`  ${colors.dim}Provider:${colors.reset}      ${deal.provider}`);
  console.log(`  ${colors.dim}Terms:${colors.reset}         ${deal.terms}`);
  console.log(`  ${colors.dim}Custody:${colors.reset}       Agent Wallet (${deal.custodyWallet})`);

  if (deal.deliverable) {
    console.log(`\n  ${colors.purple}▶ DELIVERABLE ARTIFACT:${colors.reset}`);
    console.log(`    File:        ${deal.deliverable.filename}`);
    console.log(`    SHA-256:     ${deal.deliverable.hash}`);
    console.log(`    Delivered:   ${deal.deliverable.deliveredAt}`);
    console.log(`    Timeliness:  ${deal.deliverable.timeliness}`);
  }

  if (deal.dispute) {
    console.log(`\n  ${colors.red}▶ ACTIVE DISPUTE:${colors.reset}`);
    console.log(`    Lodged By:   ${deal.dispute.lodgedBy}`);
    console.log(`    Reason:      "${deal.dispute.reason}"`);
    console.log(`    Lodged At:   ${deal.dispute.lodgedAt}`);
  }

  if (deal.arbitration) {
    console.log(`\n  ${colors.gold}▶ ARBITRATION DOCKET:${colors.reset}`);
    console.log(`    Total Score: ${deal.arbitration.score} / 100 pts`);
    console.log(`    Breakdown:   Timeliness: ${deal.arbitration.breakdown.timeliness} | Spec: ${deal.arbitration.breakdown.specMatch} | Func: ${deal.arbitration.breakdown.functionalIntegrity} | Rev: ${deal.arbitration.breakdown.revisions}`);
    console.log(`    Verdict:     ${deal.arbitration.outcome}`);
    for (const p of deal.arbitration.payouts) {
      console.log(`    Disbursement:${colors.green} ${p.amount} ${deal.asset} -> ${p.recipient}${colors.reset} (Tx: ${p.txHash})`);
    }
  }

  if (deal.settlement) {
    console.log(`\n  ${colors.green}▶ SETTLEMENT RECEIPT:${colors.reset}`);
    console.log(`    Type:        ${deal.settlement.type}`);
    console.log(`    Recipient:   ${deal.settlement.recipient}`);
    console.log(`    Payout:      ${deal.settlement.amount} ${deal.asset}`);
    console.log(`    TxHash:      ${deal.settlement.txHash}`);
    console.log(`    Settled At:  ${deal.settlement.settledAt}`);
  }

  const emails = escrowDesk.getThreadEmails(deal.dealId);
  console.log(`\n  ${colors.cyan}▶ INBOX-AS-A-DATABASE THREAD (${emails.length} events logged):${colors.reset}`);
  for (const e of emails) {
    console.log(`    • ${colors.dim}[${e.date.split('T')[1].slice(0, 8)}]${colors.reset} ${colors.bright}${e.subject}${colors.reset}`);
  }
  console.log('');
}

function parseFlags(tokens) {
  const flags = {};
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('--')) {
      const key = tokens[i].slice(2);
      const next = tokens[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

export async function executeCommand(input) {
  const trimmed = input.trim();
  if (!trimmed) return;

  const tokens = trimmed.split(/\s+/);
  const cmd = tokens[0].toLowerCase();
  const rest = tokens.slice(1);
  const flags = parseFlags(rest);

  switch (cmd) {
    case 'help':
      showHelp();
      break;

    case 'clear':
      console.clear();
      banner();
      break;

    case 'list':
    case 'ls': {
      const deals = escrowDesk.listDeals();
      renderTable(deals);
      break;
    }

    case 'status': {
      const dealId = rest[0];
      if (!dealId) {
        console.log(`${colors.red}Usage: status <dealId> (e.g. status ESC-2026-001)${colors.reset}`);
        return;
      }
      const deal = escrowDesk.getDeal(dealId.toUpperCase());
      formatStatus(deal);
      break;
    }

    case 'create': {
      const buyer = flags.buyer || rest[0] || 'agent-buyer@mermail.app';
      const provider = flags.provider || rest[1] || 'agent-worker@mermail.app';
      const amount = flags.amount || rest[2] || '50.00';
      const title = flags.title || rest.slice(3).join(' ') || 'Agent Deliverable Escrow';

      try {
        const deal = escrowDesk.createDeal({
          buyer,
          provider,
          amount,
          title
        });
        console.log(`\n${colors.green}✓ Escrow Deal Created & Initialized in Inbox Database!${colors.reset}`);
        console.log(`  Deal ID:  ${colors.bright}${colors.gold}${deal.dealId}${colors.reset}`);
        console.log(`  Custody:  ${deal.custodyWallet}`);
        console.log(`  Amount:   ${deal.amount} ${deal.asset}`);
        console.log(`  Thread:   [${deal.dealId}] Escrow Contract Initialized`);
      } catch (err) {
        console.log(`${colors.red}Error creating deal: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'fund': {
      const dealId = rest[0];
      if (!dealId) {
        console.log(`${colors.red}Usage: fund <dealId>${colors.reset}`);
        return;
      }
      try {
        const deal = escrowDesk.fundDeal(dealId.toUpperCase());
        console.log(`\n${colors.green}✓ Deal ${deal.dealId} is now FUNDED!${colors.reset}`);
        console.log(`  PayBox Custody Lock verified (${deal.amount} ${deal.asset} secured)`);
        console.log(`  Notice dispatched to provider: Authorized to commence work.`);
      } catch (err) {
        console.log(`${colors.red}Error funding deal: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'deliver': {
      const dealId = rest[0];
      const filename = flags.file || rest[1] || 'deliverable.json';
      if (!dealId) {
        console.log(`${colors.red}Usage: deliver <dealId> [filename]${colors.reset}`);
        return;
      }
      try {
        const deal = escrowDesk.deliverDeal(dealId.toUpperCase(), { filename });
        console.log(`\n${colors.green}✓ Deliverable registered for ${deal.dealId}!${colors.reset}`);
        console.log(`  File:        ${deal.deliverable.filename}`);
        console.log(`  SHA-256:     ${deal.deliverable.hash}`);
        console.log(`  Status:      DELIVERED (48-Hour Dispute Window countdown started)`);
      } catch (err) {
        console.log(`${colors.red}Error delivering deal: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'release': {
      const dealId = rest[0];
      if (!dealId) {
        console.log(`${colors.red}Usage: release <dealId>${colors.reset}`);
        return;
      }
      try {
        const deal = escrowDesk.releaseDeal(dealId.toUpperCase());
        console.log(`\n${colors.green}✓ Escrow Released & Settled!${colors.reset}`);
        console.log(`  Disbursed ${deal.settlement.amount} ${deal.asset} to ${deal.settlement.recipient}`);
        console.log(`  PayBox TxHash: ${deal.settlement.txHash}`);
      } catch (err) {
        console.log(`${colors.red}Error releasing escrow: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'dispute': {
      const dealId = rest[0];
      const reason = flags.reason || rest.slice(1).join(' ') || 'Specification mismatch detected by automated tester';
      if (!dealId) {
        console.log(`${colors.red}Usage: dispute <dealId> <reason>${colors.reset}`);
        return;
      }
      try {
        const deal = escrowDesk.disputeDeal(dealId.toUpperCase(), { reason });
        console.log(`\n${colors.red}⚠ Dispute lodged for ${deal.dealId}!${colors.reset}`);
        console.log(`  Reason: "${deal.dispute.reason}"`);
        console.log(`  State:  IN_ARBITRATION (Funds locked in custody; 18h evidence window opened)`);
      } catch (err) {
        console.log(`${colors.red}Error lodging dispute: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'arbitrate': {
      const dealId = rest[0];
      if (!dealId) {
        console.log(`${colors.red}Usage: arbitrate <dealId>${colors.reset}`);
        return;
      }
      try {
        const deal = escrowDesk.arbitrateDeal(dealId.toUpperCase());
        console.log(`\n${colors.gold}✓ AI Arbitration Completed for ${deal.dealId}!${colors.reset}`);
        console.log(`  Total Score: ${deal.arbitration.score}/100 pts`);
        console.log(`  Verdict:     ${deal.arbitration.outcome}`);
        for (const p of deal.arbitration.payouts) {
          console.log(`  ${colors.green}Disbursed:   ${p.amount} ${deal.asset} -> ${p.recipient}${colors.reset} (Tx: ${p.txHash})`);
        }
      } catch (err) {
        console.log(`${colors.red}Error arbitrating deal: ${err.message}${colors.reset}`);
      }
      break;
    }

    case 'search': {
      const query = rest.join(' ');
      const results = escrowDesk.searchEmails(query);
      console.log(`\n${colors.cyan}Found ${results.length} email event(s) matching "${query}":${colors.reset}`);
      for (const e of results) {
        console.log(`  • [${colors.gold}${e.threadId}${colors.reset}] ${colors.bright}${e.subject}${colors.reset} (${colors.dim}${e.date}${colors.reset})`);
      }
      break;
    }

    case 'demo':
      await runEscrowDemo();
      break;

    default:
      console.log(`${colors.red}Unknown command: "${cmd}". Type "help" for command list.${colors.reset}`);
      break;
  }
}

export function startInteractiveShell() {
  banner();
  console.log(` ${colors.dim}Type ${colors.cyan}help${colors.dim} for commands, ${colors.cyan}demo${colors.dim} for simulation, or ${colors.cyan}exit${colors.dim} to quit.${colors.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.gold}mermail-escrow>${colors.reset} `
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log(`\n${colors.dim}Shutting down Escrow Desk CLI session. Goodbye!${colors.reset}\n`);
      rl.close();
      process.exit(0);
    }
    await executeCommand(line);
    console.log('');
    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });
}

// Main execution entry point
const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const invokedFile = path.resolve(process.argv[1]);
    return currentFile === invokedFile;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === 'interactive' || args[0] === 'shell' || args[0] === 'repl') {
    startInteractiveShell();
  } else {
    // Direct CLI invocation
    executeCommand(args.join(' ')).then(() => {
      process.exit(0);
    });
  }
}
