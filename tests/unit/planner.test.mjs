import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TaskPlanner } from '../../src/planner.js';
import { InboxTriage } from '../../src/triage.js';
import { AgentMode, ActionRiskLevel } from '../../src/types.js';

describe('Autonomous Task Planner Unit Tests', () => {
  it('should generate DAG steps for SCHEDULING mode and identify approval boundary', () => {
    const task = InboxTriage.triageEmail({
      id: 'task_sched_plan',
      from: 'alex@client.com',
      subject: 'Reschedule sync to Friday',
      body: 'Can we move to Friday at 4 PM UTC?'
    });

    const plan = TaskPlanner.planTask(task);
    assert.equal(plan.category, AgentMode.SCHEDULING);
    assert.equal(plan.steps.length, 4);

    // Step 1: read_calendar_constraints (SAFE)
    assert.equal(plan.steps[0].tool, 'read_calendar_constraints');
    assert.equal(plan.steps[0].riskLevel, ActionRiskLevel.SAFE);
    assert.equal(plan.steps[0].requiresApproval, false);

    // Step 2: save_draft (SAFE)
    assert.equal(plan.steps[1].tool, 'save_draft');
    assert.equal(plan.steps[1].riskLevel, ActionRiskLevel.SAFE);
    assert.equal(plan.steps[1].requiresApproval, false);

    // Step 3: reply_to_email (HIGH_RISK - external message)
    assert.equal(plan.steps[2].tool, 'reply_to_email');
    assert.equal(plan.steps[2].riskLevel, ActionRiskLevel.HIGH_RISK);
    assert.equal(plan.steps[2].requiresApproval, true);

    // Step 4: register_followup (SAFE)
    assert.equal(plan.steps[3].tool, 'register_followup');
    assert.equal(plan.steps[3].riskLevel, ActionRiskLevel.SAFE);
  });

  it('should generate DAG steps for GENERAL_OPS with treasury and transfer tools', () => {
    const task = InboxTriage.triageEmail({
      id: 'task_ops_plan',
      from: 'alerts@helius.dev',
      subject: '[ALERT] Relayer low balance',
      body: 'Target Address: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R\nAmount: 1.5 SOL'
    });

    const plan = TaskPlanner.planTask(task);
    assert.equal(plan.category, AgentMode.GENERAL_OPS);

    // paybox_get_portfolio (SAFE)
    assert.equal(plan.steps[0].tool, 'paybox_get_portfolio');
    assert.equal(plan.steps[0].riskLevel, ActionRiskLevel.SAFE);

    // paybox_request_transfer (HIGH_RISK)
    assert.equal(plan.steps[1].tool, 'paybox_request_transfer');
    assert.equal(plan.steps[1].riskLevel, ActionRiskLevel.HIGH_RISK);
    assert.equal(plan.steps[1].requiresApproval, true);
  });
});
