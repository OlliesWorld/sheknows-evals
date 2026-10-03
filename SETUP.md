# Running the SheKnows evals

How to run this eval yourself. For what it found, see the [README](README.md).

## Setup (one time)

1. **Gemini API key.** Put it in a `.env` file in this folder (promptfoo loads it automatically; `.env` is gitignored):
   ```
   GOOGLE_API_KEY=your-key
   ```
   Check your billing page first. Search grounding is billed separately from tokens. The free tier allows 250 judge calls a day for `gemini-3.1-pro-preview`, and a full 4-model run needs more than that.

2. **Your prompt.** The real SheKnows prompt is private. Write your own in `prompt.private.txt` (gitignored) and put `{{claim}}` where the claim goes. [prompt.txt](prompt.txt) describes what it needs to do. The assertions expect JSON with `factual_accuracy`, `context_score`, `exaggeration_score`, `representation_score`, `explanation`, `confidence`, and (from v2) `claim_type`, or `{"error":"off_topic"}`.

3. **Optional: local models.** Install [Ollama](https://ollama.com), then:
   ```
   ollama pull llama3.1:8b
   ollama pull qwen3:8b
   ```
   Each is about 5GB. On 8GB RAM, use `llama3.2:3b` and `qwen3:4b` and update the yaml. They're commented out in [promptfooconfig.yaml](promptfooconfig.yaml) since the model comparison is done; uncomment them to rerun it.

4. **Verdict bands.** `BANDS` in [assertions/verdict.js](assertions/verdict.js) turns the 0-100 score into five steps (busted, mostly-false, mixed, mostly-true, confirmed). Match them to how your UI labels scores.

## Run it

Test a change on a few rows first:
```
npx promptfoo@latest eval --filter-first-n 3
```

Or point `tests:` in the yaml at [myths-smoke.csv](myths-smoke.csv) (8 rows: the opinions plus one busted, one recent fact and one off-topic). Then the full run:
```
npx promptfoo@latest eval --max-concurrency 1 -o results/run.json results/run.html
npx promptfoo@latest view
```

`--max-concurrency 1` stops the judge from timing out. To refill only rows that errored in an earlier run, add `--filter-errors-only results/<earlier-run>.json`.

Raw results go in `results/` and are gitignored, because every row includes the full prompt.

## Writing myths.csv

Columns: `claim, expected, type, verified, notes`

- `expected` is a label from `BANDS`, `off-topic` for junk inputs, or `opinion:<band>` for opinions and stereotypes (the band is the expected score for the claim's checkable part).
- `verified`: `yes` once you've checked the fact against a real source.
- `type` is just for reading results: busted, confirmed, complicated, recent, opinion, junk.
- `notes`: why you picked that verdict, with a source.

Pull from real claims users typed into the app if you can, and set every verdict yourself. Don't have an AI write the answer key.

## Saving money

- Every rubric edit regrades everything. Batch rubric changes and run once.
- A new prompt means no cache: every row reruns with search. Smoke-test first.
- Changing a label or a JavaScript assertion only re-scores cached answers, which is nearly free.
- Set a budget alert in Google Cloud Billing.
