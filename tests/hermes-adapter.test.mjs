import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('..', import.meta.url)));

test('Hermes adapter registers shared skills and injects routed memory through native hooks', (t) => {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
  } catch (_) {
    t.skip('python3 is unavailable for Hermes adapter contract test');
    return;
  }
  const project = mkdtempSync(join(tmpdir(), 'gipypowers-hermes-'));
  try {
    const script = String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("gipypowers", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class Mock:
    def __init__(self): self.skills, self.hooks, self.sections = [], {}, {}
    def register_skill(self, name, path): self.skills.append((name, path))
    def register_hook(self, name, callback): self.hooks[name] = callback
    def register_system_prompt_section(self, name, callback, **kwargs): self.sections[name] = (callback, kwargs)
ctx = Mock()
module.register(ctx)
module._run_update_notice = lambda root: "Gipypowers v1.1.0 is available."
session = ctx.sections["gipypowers.session"][0]({"cwd": sys.argv[2], "session_id": "test-session"})
turn = ctx.hooks["pre_llm_call"](user_message="Fix the failing auth token revocation test", session_id="test-session")
again = ctx.hooks["pre_llm_call"](user_message="Run the regression test", session_id="test-session")
print(json.dumps({"skills": [name for name, _ in ctx.skills], "session": session, "turn": turn, "again": again}))
`;
    const output = execFileSync(
      'python3',
      ['-c', script, join(ROOT, '__init__.py'), project],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output);
    assert.ok(result.skills.includes('gipypowers-memory'));
    assert.ok(result.skills.includes('systematic-debugging'));
    assert.ok(result.session.includes('Project memory:'));
    assert.ok(result.session.length <= 4000);
    assert.match(result.turn.context, /systematic-debugging/);
    assert.match(result.turn.context, /Memory CLI:/);
    assert.match(result.turn.context, /Gipypowers v1\.1\.0 is available/);
    assert.doesNotMatch(
      result.again.context,
      /Gipypowers v1\.1\.0 is available/,
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('Hermes plugin does not request privileged host capabilities', () => {
  const manifest = readFileSync(join(ROOT, 'plugin.yaml'), 'utf8');
  assert.match(manifest, /^name: gipypowers/m);
  assert.match(manifest, /provides_hooks:[\s\S]*pre_llm_call/);
  assert.doesNotMatch(manifest, /^capabilities:/m);
});
