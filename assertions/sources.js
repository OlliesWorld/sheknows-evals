const parseModelJson = require('./parse');

module.exports = (output, context) => {
  // Off-topic claims shouldn't have sources. Skip the check for them.
  if (String(context.vars.expected).toLowerCase() === 'off-topic') {
    return { pass: true, score: 1, reason: 'Skipped for off-topic input' };
  }

  const data = parseModelJson(output);
  if (!data) return { pass: false, score: 0, reason: 'Response was not valid JSON' };

  // SheKnows format: sources: [{ url, title }]
  const list = Array.isArray(data.sources) ? data.sources : [];
  const urls = list
    .map((s) => (typeof s === 'string' ? s : s && s.url))
    .filter((u) => typeof u === 'string' && /^https?:\/\/[^\s/]+\.[^\s]+/.test(u));

  if (urls.length === 0) return { pass: false, score: 0, reason: 'No source URLs' };
  // Only checks URLs LOOK real. Local models invent them. Click a few on Sunday.
  return { pass: true, score: 1, reason: `${urls.length} source URL(s)` };
};
