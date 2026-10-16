'use strict';

const ROUTES = [
  {
    intent: 'memory',
    match:
      /\b(memory|project brain|remember|forget|knowledge base|decision log)\b/i,
    skills: ['gipypowers-memory'],
  },
  {
    intent: 'update',
    match:
      /\b(update gipypowers|update plugin|check for updates|upgrade gipypowers)\b/i,
    skills: ['check-for-updates'],
  },
  {
    intent: 'bug',
    match:
      /\b(bug|broken|crash|exception|fail(?:ing)? test|test fails|failed test|fix|diagnos|regression|unexpected behavior)\b/i,
    skills: [
      'systematic-debugging',
      'test-driven-development',
      'verification-before-completion',
    ],
  },
  {
    intent: 'review',
    match:
      /\b(code review|review this|review the|review my|review pull request|audit this|inspect this diff)\b/i,
    skills: ['requesting-code-review'],
  },
  {
    intent: 'release',
    match: /\b(release|publish|ship|prepare.*pr|create.*pull request)\b/i,
    skills: [
      'verification-before-completion',
      'finishing-a-development-branch',
    ],
  },
  {
    intent: 'architecture',
    match:
      /\b(architecture|design a system|design the|system design|choose an architecture)\b/i,
    skills: [
      'brainstorming',
      'writing-plans',
      'verification-before-completion',
    ],
  },
  {
    intent: 'refactor',
    match: /\b(refactor|restructure|simplify|cleanup|clean up)\b/i,
    skills: ['test-driven-development', 'verification-before-completion'],
  },
  {
    intent: 'feature',
    match: /\b(add|build|create|implement|introduce|feature|support|enable)\b/i,
    skills: [
      'writing-plans',
      'test-driven-development',
      'verification-before-completion',
    ],
  },
];

const AUTONOMY_INSTRUCTIONS =
  'Use selected workflows as guidance and keep working inline with host-native tools. ' +
  'Scale planning to task risk and size; proceed when requirements are clear. ' +
  'Record compact task checkpoints and retry the same failure at most twice, changing strategy after repeated failure. ' +
  'Pause only for missing critical information, host permission boundaries, or irreversible high-risk actions.';

function routePrompt(prompt) {
  const text = typeof prompt === 'string' ? prompt : '';
  const route = ROUTES.find((candidate) => candidate.match.test(text));
  if (!route) return { intent: 'general', skills: [], instructions: '' };
  return {
    intent: route.intent,
    skills: route.skills.slice(0, 3),
    instructions: AUTONOMY_INSTRUCTIONS,
  };
}

module.exports = { AUTONOMY_INSTRUCTIONS, ROUTES, routePrompt };
