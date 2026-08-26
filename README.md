# Chalk

Answers that get drawn, not written.

You ask a question. If it has structure, the answer is drawn one piece at a time
with a line of narration per step, and you can scrub back and forth. If it does
not have structure, Chalk says so instead of producing a diagram about nothing.

Full product requirements, including the experiment this was built without
waiting for: https://github.com/01shrvan/whiteboard-probe/blob/main/PRD.md

## The architectural rule

**The model emits structure. It never emits a coordinate.**

Form, nodes, edges, step order — all from the model. Every x and y is computed by
a layout engine. This is not a style preference; it is the finding that killed the
predecessor project, where a model asked to place things produced a widget that
computed perfectly and rendered as an empty box.

## Pipeline

```
question -> classify -> generate -> validate -> layout -> render -> persist
                 |
                 +-> decline, in prose, with no diagram
```

No code is generated, so there is no sandbox, no runtime repair loop and no render
gate. A malformed answer fails schema validation in milliseconds.

## Forms

Three in v1: `sequence`, `dataflow`, `comparison`. The model picks from that list
and cannot invent a form, because every form is a layout engine somebody wrote.
Anything else is declined.

## Running

```
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev
```

Without an API key the app still runs and serves the five pre-generated topics
from the probe, so the rendering path is inspectable offline. Asking a new
question requires the key.
