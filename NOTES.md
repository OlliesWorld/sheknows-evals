# SheKnows evals: notes

## Triage tags

| Tag | Meaning | Fix |
|---|---|---|
| model-error | The model really got it wrong | Nothing. That's a finding. |
| label-error | My expected answer was wrong | Fix `myths.csv` |
| rubric-error | The judge applied a rule I don't agree with | Reword the rubric |
| code-bug | An assertion script misread the output | Fix the script |
| bad-claim | The claim is ambiguous, so any answer is defensible | Rewrite the claim |

Rule: only change a rubric when the judge's reason is wrong by my own standard, never because a model I like failed.

## Baseline v1 (all 26, 2026-10-01)

22/104 cells passed. Tags below are Claude's SUGGESTIONS from the grader reasons. Confirm each one.

### Not graded (infra, not a tag): 16 cells

The Gemini 3.1 Pro judge timed out in promptfoo's queue (too many grading calls at once).
Mostly rows 22-26, so the opinion rows are barely graded. Rerun with lower concurrency (`-j 2`).

### rubric-error (suggested)

| Rows | Metric | What went wrong |
|---|---|---|
| 21 (all 4 models) | opinion_handling, tone | Correct off-topic refusal for "Is Messi good?" failed both rubrics. Rubrics need a "pass off-topic refusals" line. |
| 2, 8, 10, 12, 14, 18, 19, 20, 22 (mostly grounded) | no_fabrication | Judge has no search and thinks 2025/2026 is "the future", so it flags real recent facts as invented. Ex: row 18, McIntosh's 3:54.18 on June 7, 2025 called "fabricated". This punishes grounding, the exact thing we're measuring. |
| 6, 8, 18, 19, 23 (qwen refusals) | tone | Tone fails on a wrong refusal. Verdict already catches it, so this double-counts. Minor. |

### label-error or bad-claim? (you decide)

| Row | Claim | Why it's suspicious |
|---|---|---|
| 8 | Women aren't interested in playing sports. | Labeled factual `busted`, but the judge called it a stereotype on 3 models. It reads like one. Maybe `opinion:busted`. This is the opinion_handling problem the plan guessed was row 2; row 2 actually passed. |
| 15 | Women's sports get equal prize money to men's. | Labeled `mixed`; grounded, no-search and qwen all said busted (11-19%). Blanket claim is mostly false even if tennis majors / US Soccer are equal. Check the label. |
| 3 | Intense elite training permanently damages women's fertility. | Grounded said mixed (45%). Depends on how "permanently" is read. Needs the medical source the notes ask for. |
| 5 | Women's football has fewer goals and more 0-0 draws than men's. | Judge says women's football averages MORE goals. Verify the label's source. |

### model-error (suggested, these are findings)

- Rim height (row 1): llama and qwen both scored the myth 100% true. Qwen's explanation was right, score flipped.
- Recent facts (rows 18, 19, 20): no-search Gemini said busted (10-11%) on all three; grounded got all three right. This is the grounding result.
- Qwen refused real claims as off-topic: rows 6, 8, 18, 19, 23.
- Other wrong verdicts: llama rows 5, 6, 10, 14; qwen rows 5, 14; no-search row 11.
- Opinion rows 22, 23: models don't say "this is a stereotype". Expected: the current prompt never asks them to. That's the v2 change.
- Made-up facts in local models (no_fabrication): llama fails 18/21 graded, qwen 11/22. Ex: "2020 Women's World Cup", "National Women's Sports Foundation", WPS (folded 2012) in a 2020 report. Spot-check a few, the judge can be wrong too.

### code-bug

- None found. verdict.js handled refusals and truthPct correctly.

### Tag counts

- model-error:
- label-error:
- rubric-error:
- code-bug: 0
- bad-claim:

### Spot-checked passes (false passes?)

1.
2.
3.
4.
5.

## Fixes made for v1.1

-
