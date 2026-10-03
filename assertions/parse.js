// Pulls a JSON object out of a model response, even if it's wrapped in ```json fences
// or has chatty text around it. Returns null if nothing parses.
module.exports = function parseModelJson(output) {
  if (output && typeof output === 'object') return output;
  if (typeof output !== 'string') return null;

  const cleaned = output.replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};
