import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const skillsRoot = path.join(rootDir, 'skills');

async function validateSkillPackage(skillName) {
  console.log(`Testing skills/${skillName} against Mermail repository standards...`);
  const skillDir = path.join(skillsRoot, skillName);
  const errors = [];

  // Check SKILL.md
  const skillFile = path.join(skillDir, 'SKILL.md');
  const markdown = (await readFile(skillFile, 'utf8')).replace(/\r\n/g, '\n');

  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) {
    errors.push(`${skillName}/SKILL.md: missing YAML frontmatter`);
  } else {
    if (!frontmatter[1].includes(`name: ${skillName}\n`)) {
      errors.push(`${skillName}/SKILL.md: name must match directory (${skillName})`);
    }
    if (!frontmatter[1].includes('metadata:\n  openclaw:')) {
      errors.push(`${skillName}/SKILL.md: missing metadata.openclaw block for ClawHub`);
    }
    if (!frontmatter[1].includes('primaryEnv: MERMAIL_API_KEY')) {
      errors.push(`${skillName}/SKILL.md: primaryEnv must be MERMAIL_API_KEY`);
    }
    if (!frontmatter[1].includes('- MERMAIL_API_KEY')) {
      errors.push(`${skillName}/SKILL.md: requires.env must include MERMAIL_API_KEY`);
    }
  }

  if (markdown.includes('TODO')) {
    errors.push(`${skillName}/SKILL.md: contains unresolved TODOs`);
  }

  const lineCount = markdown.split('\n').length;
  if (lineCount > 500) {
    errors.push(`${skillName}/SKILL.md: line count (${lineCount}) exceeds 500 lines limit`);
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
      errors.push(`${skillName}/SKILL.md: missing required section or link: ${sec}`);
    }
  }

  // Check agents/openai.yaml
  const openaiYamlPath = path.join(skillDir, 'agents', 'openai.yaml');
  const openaiYaml = await readFile(openaiYamlPath, 'utf8');
  for (const req of [
    'display_name:',
    'short_description:',
    `default_prompt: "Use $${skillName}`,
    'type: "mcp"',
    'url: "https://console.mermail.app/mcp"'
  ]) {
    if (!openaiYaml.includes(req)) {
      errors.push(`${skillName}/agents/openai.yaml: missing required field: ${req}`);
    }
  }

  // Check reference files
  const requiredRefs = [
    'references/tools.md',
    'references/security.md',
    'references/workflows.md'
  ];

  for (const ref of requiredRefs) {
    try {
      await stat(path.join(skillDir, ref));
    } catch {
      errors.push(`${skillName}: missing reference document: ${ref}`);
    }
  }

  return errors;
}

async function main() {
  const skillDirs = (await readdir(skillsRoot, { withFileTypes: true }))
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let totalErrors = [];
  for (const skill of skillDirs) {
    const errs = await validateSkillPackage(skill);
    totalErrors = totalErrors.concat(errs);
  }

  if (totalErrors.length > 0) {
    console.error('\n❌ Skill validation failed with errors:');
    for (const err of totalErrors) {
      console.error(` • ${err}`);
    }
    process.exit(1);
  }

  console.log(`\n✅ Skill validation passed! All ${skillDirs.length} skill(s) conform 100% to Mermail Skills standards.`);
}

main().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
