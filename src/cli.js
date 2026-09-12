#!/usr/bin/env node
import { MermailRelayerSentinel } from './sentinel-agent.js';
import { SentinelStatus } from './types.js';

const sentinel = new MermailRelayerSentinel();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('\n🛡️  MERMAIL RELAYER SENTINEL — Autonomous Gas & Treasury Ops');
  console.log('─────────────────────────────────────────────────────────────\n');

  switch (command) {
    case 'status': {
      console.log('Allowlisted Relayers:');
      for (const r of sentinel.config.relayers) {
        console.log(` • [${r.chain.toUpperCase()}] ${r.name} (${r.id})`);
        console.log(`   Address:   ${r.address}`);
        console.log(`   Threshold: ${r.minThreshold} ${r.token} | Target: ${r.targetBalance} ${r.token}`);
      }
      console.log('\nDaily Budget:');
      console.log(` • Cap:       $${sentinel.config.dailyMaxUsdCap} USD`);
      console.log(` • Remaining: $${sentinel.budgetTracker.getRemainingBudget()} USD\n`);
      break;
    }

    case 'scan': {
      console.log('🔍 Scanning Mermail Inbox for relayer threshold deficit alerts...');
      const incidents = await sentinel.scanForIncidents();
      console.log(`Found ${incidents.length} alert message(s):\n`);

      for (const inc of incidents) {
        if (inc.status === SentinelStatus.AWAITING_OPERATOR_APPROVAL) {
          console.log(inc.preview);
          console.log('\nRun "node src/cli.js process --auto-approve" to authorize replenishment.\n');
        } else if (inc.status === SentinelStatus.REJECTED_SECURITY_VIOLATION) {
          console.log(`🚨 SECURITY ALERT: ${inc.reason}`);
          console.log(`   From:    ${inc.alert.sender}`);
          console.log(`   Subject: ${inc.alert.subject}`);
          console.log(`   Target:  ${inc.alert.targetAddress}`);
          console.log('   Action:  Refused transfer. Email quarantined.\n');
        } else {
          console.log(`Status: ${inc.status} (${inc.reason || 'Processed'})\n`);
        }
      }
      break;
    }

    case 'process': {
      const autoApprove = args.includes('--auto-approve');
      console.log('🔍 Scanning and triaging alerts...');
      const incidents = await sentinel.scanForIncidents();

      for (const inc of incidents) {
        if (inc.status === SentinelStatus.AWAITING_OPERATOR_APPROVAL) {
          console.log('\n' + inc.preview);
          if (autoApprove) {
            console.log('\n⚡ Operator approval granted. Executing PayBox replenishment...');
            const result = await sentinel.executeReplenishment(inc);
            console.log('\n✅ SETTLED ON-CHAIN:');
            console.log(` • Request ID: ${result.requestId}`);
            console.log(` • Tx Hash:    ${result.txHash}`);
            console.log(' • Receipt:    Dispatched to alerting thread via reply_to_email');
            console.log(' • Audit Log:  Saved to Mermail drafts via save_draft\n');
          } else {
            console.log('\n⚠️  Execution paused. Pass --auto-approve to confirm transaction.\n');
          }
        }
      }
      break;
    }

    case 'help':
    default:
      console.log('Usage:');
      console.log('  node src/cli.js status                 Show configured relayers & treasury budget');
      console.log('  node src/cli.js scan                   Scan inbox and preview pending deficits');
      console.log('  node src/cli.js process --auto-approve Execute replenishment with operator approval\n');
      break;
  }
}

main().catch((err) => {
  console.error('Fatal Sentinel Error:', err);
  process.exit(1);
});
