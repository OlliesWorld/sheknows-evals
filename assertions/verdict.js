const parseModelJson = require('./parse');

// SheKnows returns truthPct (0-100). These bands turn it into a verdict step.
// >>> EDIT to match how your UI maps truthPct to labels. <<<
// Lowest to highest. [min, max, label], inclusive.
const BANDS = [
  [0, 20, 'busted'],
  [21, 40, 'mostly-false'],
  [41, 60, 'mixed'],
  [61, 80, 'mostly-true'],
  [81, 100, 'confirmed'],
];
const LABELS = BANDS.map((b) => b[2]);

const normalize = (s) => String(s || '').toLowerCase().trim().replace(/[\s_]+/g, '-');

const looksOffTopic = (data, raw) =>
  (data && typeof data.error === 'string') ||
  /not .{0,20}about women'?s sports|off[- ]topic/i.test(String(raw || ''));

module.exports = (output, context) => {
  // Opinion rows look like "opinion:busted". The band after the colon is the
  // expected score for the claim's checkable factual core.
  let want = normalize(context.vars.expected);
  if (want.startsWith('opinion:')) want = want.slice('opinion:'.length);
  const data = parseModelJson(output);

  // Pure-taste opinions ("opinion:none") have no checkable part at all.
  // The model must leave every score null instead of guessing a number.
  if (want === 'none') {
    if (!data) return { pass: false, score: 0, reason: 'Response was not valid JSON' };
    const scoreFields = ['factual_accuracy', 'context_score', 'exaggeration_score', 'representation_score', 'confidence'];
    const allNull = scoreFields.every((f) => data[f] === null);
    return allNull
      ? { pass: true, score: 1, reason: 'Correctly left all scores null — matter of taste' }
      : {
          pass: false,
          score: 0,
          reason: `Guessed numbers for a pure-taste claim instead of null: ${JSON.stringify(
            Object.fromEntries(scoreFields.map((f) => [f, data[f]]))
          )}`,
        };
  }

  // The SheKnows prompt returns four sub-scores, not truthPct. Combine them with
  // the prompt's weights. >>> Check this matches the app's code. <<<
  // Capped at factual_accuracy + 20, same as the app (src/pages/api/she-knows.ts).
  if (data && typeof data.truthPct !== 'number' && typeof data.factual_accuracy === 'number') {
    data.truthPct = Math.min(
      Math.round(
        data.factual_accuracy * 0.4 +
        (Number(data.context_score) || 0) * 0.25 +
        (Number(data.exaggeration_score) || 0) * 0.25 +
        (Number(data.representation_score) || 0) * 0.1
      ),
      data.factual_accuracy + 20
    );
  }

  // Junk inputs: the right answer is refusing, not scoring.
  if (want === 'off-topic') {
    const hasScore = data && typeof data.truthPct === 'number';
    return looksOffTopic(data, output) && !hasScore
      ? { pass: true, score: 1, reason: 'Correctly declined an off-topic claim' }
      : { pass: false, score: 0, reason: hasScore ? `Scored an off-topic claim (truthPct ${data.truthPct})` : 'Did not clearly decline' };
  }

  const wantIdx = LABELS.indexOf(want);
  if (wantIdx === -1) {
    return { pass: false, score: 0, reason: `Bad label in myths.csv: "${context.vars.expected}". Use one of: ${LABELS.join(', ')}, off-topic` };
  }
  if (!data) return { pass: false, score: 0, reason: 'Response was not valid JSON' };
  if (data.error) return { pass: false, score: 0, reason: `Refused a real claim: "${data.error}"` };

  const pct = Number(data.truthPct);
  if (!Number.isFinite(pct)) return { pass: false, score: 0, reason: 'No numeric truthPct' };

  const gotIdx = BANDS.findIndex(([min, max]) => pct >= min && pct <= max);
  if (gotIdx === -1) return { pass: false, score: 0, reason: `truthPct out of range: ${pct}` };

  const got = LABELS[gotIdx];
  const distance = Math.abs(gotIdx - wantIdx);
  if (distance === 0) return { pass: true, score: 1, reason: `Exact: ${got} (${pct}%)` };
  if (distance === 1) return { pass: true, score: 0.5, reason: `Within one step: expected ${want}, got ${got} (${pct}%)` };
  return { pass: false, score: 0, reason: `Off by ${distance} steps: expected ${want}, got ${got} (${pct}%)` };
};
