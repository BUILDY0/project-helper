// SessionStart Hook: inject skill-load instructions at session start
// Ensures caveman + check-answer always load, even if AI misses workspace rules.

const output = {
  continue: true,
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext:
      'CRITICAL — execute immediately, before any user response:\n' +
      "1. use_skill('caveman')     — caveman full mode, terse communication\n" +
      "2. use_skill('check-answer') — self-review before delivering code\n" +
      'Skip neither. This is a hard requirement override, not a suggestion.'
  }
}

process.stdout.write(JSON.stringify(output))
