import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
function sessionHook() {
  const cwd = mkdtempSync(join(tmpdir(), 'gipypowers-integration-'));
  try {
    const out = execFileSync(
      'node',
      [join(ROOT, 'hooks/gipypowers-activate.js')],
      {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: ROOT,
          GIPYPOWERS_NO_UPDATE_CHECK: '1',
        },
        input: JSON.stringify({
          hook_event_name: 'SessionStart',
          source: 'resume',
          cwd,
        }),
        encoding: 'utf8',
      },
    );
    return JSON.parse(out).hookSpecificOutput.additionalContext;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test('all 15 skills exist with SKILL.md + openai.yaml', () => {
  const expected = [
    'using-superpowers',
    'brainstorming',
    'writing-plans',
    'executing-plans',
    'subagent-driven-development',
    'dispatching-parallel-agents',
    'test-driven-development',
    'systematic-debugging',
    'verification-before-completion',
    'requesting-code-review',
    'receiving-code-review',
    'finishing-a-development-branch',
    'using-git-worktrees',
    'writing-skills',
    'gipypowers-memory',
  ];
  const present = readdirSync(join(ROOT, 'skills'));
  for (const s of expected) {
    assert.ok(present.includes(s), `missing skill: ${s}`);
    assert.ok(
      existsSync(join(ROOT, 'skills', s, 'SKILL.md')),
      `no SKILL.md: ${s}`,
    );
    assert.ok(
      existsSync(join(ROOT, 'skills', s, 'agents', 'openai.yaml')),
      `no openai.yaml: ${s}`,
    );
  }
});

test('no @-path force-loads in any skill body', () => {
  for (const s of readdirSync(join(ROOT, 'skills'))) {
    const p = join(ROOT, 'skills', s, 'SKILL.md');
    if (!existsSync(p)) continue;
    const body = readFileSync(p, 'utf8').replace(/^---\n[\s\S]*?\n---\n?/, '');
    assert.ok(!/(^|\s)@[\w./-]+\.md/.test(body), `@ force-load in ${s}`);
  }
});

test('full SessionStart payload contains all automatic layers', () => {
  const text = sessionHook();
  for (const m of [
    'CAVEMAN',
    'PONYTAIL',
    'I-HAVE-ADHD',
    'NO-AI-SLOP',
    'action first',
    'preserve intent',
    'invoke',
    'missing information',
    '27k',
    'cannot be disabled by user request',
    'execute inline by default',
  ])
    assert.ok(text.toLowerCase().includes(m.toLowerCase()), `missing: ${m}`);
  for (const m of ['CAVEMAN-REVIEW', 'PONYTAIL-AUDIT', 'PONYTAIL-GAIN'])
    assert.ok(text.includes(m), `missing helper: ${m}`);
});

test('SessionStart payload does not offer inline versus sub-agent choice', () => {
  const text = sessionHook().toLowerCase();
  assert.ok(text.includes('execute inline by default'));
  assert.ok(!text.includes('choose between inline and sub-agent'));
});

test('workflow docs route ordinary work inline', () => {
  const docs = [
    'skills/executing-plans/SKILL.md',
    'skills/writing-plans/SKILL.md',
    'skills/writing-skills/SKILL.md',
  ].map((p) => readFileSync(join(ROOT, p), 'utf8').toLowerCase());
  for (const text of docs) {
    assert.ok(text.includes('execute inline by default'));
    assert.match(text, /explicitly invoke/);
    assert.ok(!text.includes('which approach?'));
    assert.ok(!text.includes('always use subagents'));
  }
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8').toLowerCase();
  assert.ok(readme.includes('inline by default'));
});

test('workflow docs enforce one implementation commit', () => {
  const docs = [
    'skills/using-superpowers/SKILL.md',
    'skills/writing-plans/SKILL.md',
    'skills/executing-plans/SKILL.md',
  ].map((p) => readFileSync(join(ROOT, p), 'utf8').toLowerCase());
  for (const text of docs) {
    assert.ok(text.includes('single commit'));
    assert.ok(text.includes('commit --amend'));
    assert.ok(!text.includes('frequent commits'));
    assert.ok(!text.includes('one commit per task'));
  }
  const finishing = readFileSync(
    join(ROOT, 'skills/finishing-a-development-branch/SKILL.md'),
    'utf8',
  ).toLowerCase();
  assert.ok(finishing.includes('one implementation commit'));
});

test('always-resident session context stays under 1650 words', () => {
  const text = sessionHook();
  const words = text.split(/\s+/).filter(Boolean).length;
  assert.ok(words < 1650, `always-on payload too large: ${words} words`);
});
