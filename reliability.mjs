const Q = [
  ["sequence",   "How does the TCP three-way handshake work?"],
  ["sequence",   "Walk me through the OAuth authorization code flow"],
  ["comparison", "What is the difference between git rebase and git merge?"],
  ["comparison", "Compare optimistic locking against pessimistic locking"],
  ["dataflow",   "How does a request move through a transformer block?"],
  ["dataflow",   "How does a webpack build turn source into a bundle?"],
  ["refuse",     "Why did the First World War start?"],
  ["refuse",     "How do I make carbonara?"],
];
const RUNS = Number(process.env.RUNS ?? 1);
const GAP = Number(process.env.GAP ?? 8000);
const tally = {};

for (const [expect, q] of Q) {
  for (let i = 0; i < RUNS; i++) {
    const t0 = Date.now();
    let got = "error", attempts = 0;
    try {
      const res = await fetch("http://localhost:3000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      if (d.turn?.answer?.kind === "drawn") {
        got = d.turn.answer.spec.form;
        attempts = d.turn.answer.attempts;
      } else if (d.turn?.answer?.kind === "declined") {
        got = d.turn.answer.reason.includes("malformed") ? "MALFORMED" : "refuse";
      }
    } catch { got = "network"; }

    const ok = expect === "refuse" ? got === "refuse" : got === expect;
    const key = `${expect}`;
    tally[key] ??= { pass: 0, total: 0, notes: [] };
    tally[key].total++;
    if (ok) tally[key].pass++;
    else tally[key].notes.push(got);
    if (attempts > 1) tally[key].notes.push(`repaired(${attempts})`);
    await new Promise((r) => setTimeout(r, GAP));
    console.log(`${ok ? "PASS" : "FAIL"}  ${expect.padEnd(10)} -> ${String(got).padEnd(11)} ${((Date.now()-t0)/1000).toFixed(1)}s  ${q.slice(0,42)}`);
  }
}

console.log("\n--- rate ---");
for (const [k, v] of Object.entries(tally)) {
  console.log(`${k.padEnd(11)} ${v.pass}/${v.total}${v.notes.length ? "   " + [...new Set(v.notes)].join(", ") : ""}`);
}
