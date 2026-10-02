# SheKnows evals

Question: how much does Google Search grounding actually help SheKnows get verdicts right?

Four setups answer the same claims:

| Label | What it is |
|---|---|
| gemini-flash-grounded | What the app uses today |
| gemini-flash-no-search | Same model, search off. The fair comparison. |
| llama-8b-local | Local, free, no search |
| qwen-8b-local | Local, free, no search |

Each answer gets three scores: **verdict** (within one step of your label), **sources** (gave real-looking URLs), **tone** (judged by Gemini 2.5 Pro).

## Setup (one time, about an hour)

1. **Install Ollama** from ollama.com, then pull the local models:
   ```
   ollama pull llama3.1:8b
   ollama pull qwen3:8b
   ```
   Check it works: `ollama run llama3.1:8b "hi"`. Each model is about 5GB.
   On 8GB RAM, use `llama3.2:3b` and `qwen3:4b` instead (and update the yaml).

2. **Set your Gemini key** (same kind of key SheKnows uses):
   ```
   export GOOGLE_API_KEY="your-key"
   ```
   Check your billing page first. Search grounding is billed separately from tokens.

3. **Copy the real prompt** from SheKnows into `prompt.txt`. Put `{{claim}}` where the claim goes.

4. **Match your verdict bands.** SheKnows returns `truthPct` (0-100). `BANDS` in `assertions/verdict.js` turns that into five steps (busted, mostly-false, mixed, mostly-true, confirmed). Change the cutoffs to match how your UI maps `truthPct` to labels.

5. **Verify myths.csv** (see below). This is the real work.

## Optional: test the real app instead of the prompt

promptfoo can hit your API directly with its `http` provider. That tests the whole app, including the off-topic filter and error handling. Run SheKnows locally (`npm run dev`) with the 2-per-day rate limit turned off in dev, then point an `http` provider at `http://localhost:4321/api/...`. Do this after the main comparison works.

## Run it

```
npx promptfoo@latest eval
npx promptfoo@latest view
```

`view` opens a side-by-side grid in the browser. Start there.

Tip: run with 3 claims first to catch setup bugs before burning search credits:
```
npx promptfoo@latest eval --filter-first-n 3
```

## Writing myths.csv

Columns: `claim, expected, type, verified, notes`

- `expected` must be a label from `BANDS`, or `off-topic` for junk inputs.
- Opinion and stereotype claims use `opinion:<band>`, e.g. `opinion:busted`. The band is the expected score for the claim's checkable factual core. They're also graded on `claim_type` (must be flagged "opinion") and an opinion-handling rubric.
- Factual claims flagged as "opinion" fail `claim_type`. That catches a model dodging hard facts.
- `verified`: put `yes` once YOU have checked the fact against a real source. Don't run the full eval until every row says yes.
- `type` is just for you when reading results: busted, confirmed, complicated, recent.
- `notes` is why you picked that verdict, with a source. Future you will thank you.

**Start with 20:**
- 8 clearly busted
- 5 clearly confirmed (without these you can't catch a model that busts everything)
- 4 complicated (depends on the league, partly true)
- 3 recent facts from the last year (where search should win)

Pull from real claims users typed into SheKnows if you can. Real inputs beat invented ones.
**You** set every verdict. Don't have an AI write the answer key.

## Sunday: reading the results

1. In `view`, filter to failures. Read every one.
2. Tag each failure: wrong verdict, made-up stat, fake source, preachy tone, broken JSON.
3. Change ONE thing in the prompt, rerun, compare.
4. Write it up:
   - Grounded: X/20 verdicts, Y/20 with sources
   - No search: X/20
   - Best local: X/20
   - Prompt change moved: before → after

## Known gotchas

- **Grounded Gemini sources:** the app may pull sources from Gemini's grounding metadata, not the text. If so, the grounded run can fail the sources check unfairly. Only count sources it writes into the JSON, and note it in the write-up.
- **Local models invent URLs.** The sources check only looks at URL shape. Click a few.
- **Results can change** as Gemini updates. Save each run's summary with the date.
# sheknows-evals
