const parseModelJson = require('./parse');

// Checks the claim_type flag.
// Opinion rows (expected "opinion:<band>") must be flagged "opinion".
// Factual rows must be flagged "factual". Calling a fact an "opinion" is a
// dodge, and it should fail.
const OPINION_VALUES = ['opinion', 'stereotype'];

module.exports = (output, context) => {
  const expected = String(context.vars.expected || '').toLowerCase();
  if (expected === 'off-topic') return { pass: true, score: 1, reason: 'Skipped for off-topic input' };

  const data = parseModelJson(output);
  if (!data) return { pass: false, score: 0, reason: 'Response was not valid JSON' };

  const got = String(data.claim_type || '').toLowerCase().trim();
  if (!got) return { pass: false, score: 0, reason: 'No claim_type field. Did you update the prompt?' };

  const gotOpinion = OPINION_VALUES.includes(got);
  const wantOpinion = expected.startsWith('opinion');

  if (wantOpinion && gotOpinion) return { pass: true, score: 1, reason: 'Flagged as opinion' };
  if (!wantOpinion && !gotOpinion) return { pass: true, score: 1, reason: 'Flagged as factual' };
  return wantOpinion
    ? { pass: false, score: 0, reason: `Opinion treated as fact (claim_type: ${got})` }
    : { pass: false, score: 0, reason: `Fact dodged as opinion (claim_type: ${got})` };
};
