# SheKnows Evals

[SheKnows](https://sheknows.olliesworld.xyz/) is my AI app that busts myths about women's sports. You type a claim, it searches the web with Gemini, and scores how true it is.

It looked like it worked. I wanted to know if it actually did. So I built an eval.

**Short version:** search grounding is doing the heavy lifting, and one prompt change took the app from 16 to 23 out of 26 test claims passing. Along the way I found three bugs in the live app and four bugs in my own eval.

Want to run it yourself? See [SETUP.md](SETUP.md).

---

## The questions

1. Does Google Search grounding actually help, or is the model doing the work?
2. Can a free local model do this job?
3. Where does the app fail, and can I fix it?

## The setup

**26 test claims**, labeled by me:

| Type | Count | Example |
|---|---|---|
| Busted myths | 8 | "The WNBA rim is lower than the NBA rim" |
| Confirmed facts | 5 | "Title IX was enacted in 1972..." |
| It's complicated | 4 | "Women's sports leagues are profitable" |
| Recent facts (2025) | 3 | "The PWHL expanded to eight teams for 2025-26" |
| Opinions and stereotypes | 5 | "Women are too emotional to coach" |
| Off-topic | 1 | "Is Messi good?" |

Some test claims are offensive on purpose. Real users submit stereotypes, so the app needs to handle them well.

**4 setups, same prompt:**

- Gemini 2.5 Flash **with** Google Search (what the app uses)
- Gemini 2.5 Flash **without** search
- Llama 3.1 8B, running locally with Ollama
- Qwen3 8B, running locally with Ollama

**Scoring:** [promptfoo](https://www.promptfoo.dev), with checks for:

- **verdict:** the score lands within one step of my label (busted, mostly false, mixed, mostly true, confirmed)
- **no_fabrication:** no made-up stats, dates or names (an AI judge with search checks them)
- **opinion_handling:** opinions get called opinions, and the checkable part gets checked
- **claim_type:** the app flags opinion vs. fact correctly (added in v2)

The production prompt is kept private. In the app it lives in an environment variable, not the source code.

---

## Finding 1: Search grounding wins, by a lot

| | Verdict | No fabrication |
|---|---|---|
| Gemini with search | **0.84** | **0.91** |
| Gemini without search | 0.75 | 0.59 |
| Qwen 8B local | 0.57 | 0.45 |
| Llama 8B local | 0.57 | 0.09 |

The gap shows up best on recent facts. All three claims are true:

| Claim | With search | Without search | Llama | Qwen |
|---|---|---|---|---|
| McIntosh 400m free world record, 2025 | ✅ 88% | ❌ 11% | ❌ 35% | refused |
| Ledecky 800m free world record, 2025 | ✅ 91% | ❌ 10% | ❌ 35% | refused |
| PWHL expands to 8 teams | ✅ 92% | ❌ 11% | ✅ 100% | ✅ 88% |

**Without search, the same Gemini model busted all three true facts with 95 to 100% confidence.** It told users Ledecky set that record in 2016. For a myth-busting app, a confident wrong answer is the worst possible failure.

(Llama's PWHL "win" is luck. It cited "the PWHL website," which it can't access.)

## Finding 2: Small local models aren't ready for this

- **Llama made things up in almost every answer** (0.09 on no_fabrication). It said the WNBA rim is "3 feet 9 inches lower" and scored the myth 100% true. Both rims are 10 feet.
- **Qwen scored its own explanation instead of the claim.** It correctly said the rims are the same height, then scored the myth as confirmed.
- **Qwen refused 5 real claims as off-topic,** including both swimming records.

They're free and private, but not for a fact-checking app.

## Finding 3: The live app had three real bugs

**Bug 1: Opinions were blocked as off-topic.** "Women's football is more exciting than men's football" got *"That claim doesn't appear to be about women's sports."* Comparisons that mention men's sports tripped the filter.

**Bug 2: Opinions were graded like facts.** "Women's sports are not exciting" got busted with viewership numbers, as if "exciting" could be measured.

**Bug 3: About 1 in 8 answers crashed the app.** Gemini can't use strict JSON mode with search on, and 3 of 26 v1 answers put text before the JSON. The app ran `JSON.parse` on the whole response, so those users got *"Failed to evaluate claim."* The eval's parser had quietly handled it, which is why the scores never showed it. **Fix:** the app now finds the JSON object inside the response, and has more output room for the times Gemini dumps its working-out first.

### The fix (v2 prompt)

Three changes:
1. Opinions and comparisons are in scope, even when they mention men's sports
2. A new `claim_type` field: factual or opinion
3. One example showing how to split an opinion from its checkable part

Rules alone didn't work for #3. The model kept calling the wrong half the opinion. **One example fixed it.**

### Results (Gemini with search, all 26 claims)

| | v1 | v2 |
|---|---|---|
| Claims fully passing | 16 / 26 | **23 / 26** |
| Verdict score | 0.79 | **0.94** |
| Opinions handled correctly | 0 / 5 | **5 / 5** |
| Real claims wrongly refused | 2 | **0** |
| Messi still refused | ✅ | ✅ |

Now the app says things like: *"'Not exciting' is a matter of taste. However, the claim that women's sports are 'not popular' is factually incorrect..."*

One caveat: a few factual claims also improved in v2. The prompt didn't target those, so some of that is likely search returning different results run to run. The opinion and off-topic wins are the real prompt effect.

---

## Bugs I found in my own eval

Honestly the most useful part. An eval is only as good as its grader.

**1. The AI judge thought it was 2024.** My fact-checking judge had no search and didn't know today's date. It failed correct answers about 2025 events as "invented future dates" and passed the wrong answers. Grounded Gemini scored *worst* on fabrication because it was right. **Fix:** gave the judge the date and search. Grounded Gemini's score went from 0.48 to 0.91.

**2. A metric that everyone aces tells you nothing.** Every model scored a perfect 1.00 on tone. I dropped it, which also cut judge calls by a third.

**3. Infrastructure breaks.** The judge model was retired mid-project (404), and judge calls timed out when too many queued up. Lower concurrency fixed it.

**4. My first draft of test claims came from an AI.** Several were opinions dressed as facts, one contradicted its own label, and some numbers were off. I cut it down and I'm verifying every label myself against a real source. An AI shouldn't write the answer key for an AI test.

## Other things I learned

- **Opinion scores are unstable.** "Men's sports are more entertaining" scored 17%, then 20%, then 48% across runs. Search results change. So the app now labels opinion claims ("Opinion · Busted") and says the score covers only the checkable part.
- **Cost:** the full project cost about $7.00, mostly from the AI judge running searches. I cut it by testing only the production setup once the model comparison was answered, and by testing prompt changes on 8 claims before running all 26.

## Limits

- 26 claims is small. Big gaps are real; small ones (a few %) are noise.
- The judge is Gemini grading Gemini. I spot-check its failures by hand, but a different judge could score differently.
- The eval ran Gemini with thinking on; the app runs it with thinking off. A rerun on the exact production settings is next, and the numbers above may move.
- I wrote every label. Some "it's complicated" claims are judgment calls.
- Search results change, so reruns won't match exactly.

## What's next

- **Match production exactly:** thinking off, same output limit, same verdict cutoffs as the UI. Then rerun v1 vs. v2
- **Shipped:** robust JSON parsing, the v2 prompt, and an opinion label in the UI
- **Gemini Flash-Lite:** can I run SheKnows cheaper without losing accuracy?
- **Claude with web search:** is Gemini the right provider at all?
- **More recent facts:** grow the test set from real user claims and real failures