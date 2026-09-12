import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const skillDir = path.join(rootDir, 'skills', 'mermail-relayer-sentinel');

async function validateSkill() {
  console.log('Testing skills/mermail-relayer-sentinel against Mermail repository standards...\n');
  const errors = [];

  // Check SKILL.md
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markdown = (await readFile(skillFile, 'utf8')).replace(/\r\n/g, '\n');

  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    errors.push('SKILL.md: missing YAML frontmatter');
  } else {
    if (!frontmatter[1].includes('name: mermail-relayer-sentinel\n')) {
      errors.push('SKILL.md: name must match directory (mermail-relayer-sentinel)');
    }
    if (!frontmatter[1].includes('metadata:\n  openclaw:')) {
      errors.push('SKILL.md: missing metadata.openclaw block for ClawHub');
    }
    if (!frontmatter[1].includes('primaryEnv: MERMAIL_API_KEY')) {
      errors.push('SKILL.md: primaryEnv must be MERMAIL_API_KEY');
    }
    if (!frontmatter[1].includes('- MERMAIL_API_KEY')) {
      errors.push('SKILL.md: requires.env must include MERMAIL_API_KEY');
    }
  }

  if (markdown.includes('TODO')) {
    errors.push('SKILL.md: contains unresolved TODOs');
  }

  const lineCount = markdown.split('\n').length;
  if (lineCount > 500) {
    errors.push(`SKILL.md: line count (${lineCount}) exceeds 500 lines limit`);
  }

  const requiredSections = [
    '## Overview',
    '## Preferred Deliverables',
    '## Workflow',
    '## Write Safety',
    '## Output Conventions',
    '## Example Requests',
    '[tools.md](references/tools.md)',
    '[security.md](references/security.md)'
  ];

  for (const sec of requiredSections) {
    if (!markdown.includes(sec)) {
      errors.push(`SKILL.md: missing required section or link: ${sec}`);
    }
  }

  // Check agents/openai.yaml
  const openaiYamlPath = path.join(skillDir, 'agents', 'openai.yaml');
  const openaiYaml = await readFile(openaiYamlPath, 'utf8');
  for (const req of [
    'display_name:',
    'short_description:',
    'default_prompt: "Use $mermail-relayer-sentinel',
    'type: "mcp"',
    'url: "https://console.mermail.app/mcp"'
  ]) {
    if (!openaiYaml.includes(req)) {
      errors.push(`openai.yaml: missing required field: ${req}`);
    }
  }

  // Check reference files
  const requiredRefs = [
    'references/tools.md',
    'references/security.md',
    'references/workflows.md',
    'references/allowlist.md',
    'references/templates.md'
  ];

  for (const ref of requiredRefs) {
    try {
      await stat(path.join(skillDir, ref));
    } catch {
      errors.push(`Missing reference document: ${ref}`);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Skill validation failed with errors:');
    for (const err of errors) {
      console.error(` • ${err}`);
    }
    process.exit(1);
  }

  console.log('✅ Skill validation passed! mermail-relayer-sentinel conforms 100% to Mermail Skills standards.\n');
}

validateSkill().catch((err) => {
  console.error('Fatal validator error:', err);
  process.exit(1);
});
