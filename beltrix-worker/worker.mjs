// BELTRIX dedicated always-on PAPER worker.
// No brokerage credentials or live-order functionality.
const BASE = (process.env.BELTRIX_BASE_URL || "https://beltrix-futures.floot.app").replace(/\/$/, "");
const PERIOD_MS = 60_000;
const TIMEOUT_MS = 45_000;
const MAX_FAILURE_DELAY_MS = 120_000;
let stopping = false;
let consecutiveFailures = 0;
let lastSuccess = null;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function jsonRequest(path, method = "GET", timeout = TIMEOUT_MS) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: method === "POST" ? JSON.stringify({ json: {} }) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(path + " HTTP " + res.status);
  return res.json();
}
function unwrap(x) { return x?.json ?? x; }
async function tick() {
  const health = unwrap(await jsonRequest("/_api/health", "GET", 15_000));
  if (health.status !== "OK" || health.paperOnly !== true || health.mode !== "PAPER_ONLY")
    throw new Error("PAPER_SAFETY_BLOCK");
  const result = unwrap(await jsonRequest("/_api/cycle", "POST"));
  if (result.ok !== true) throw new Error("CYCLE_FAILED: " + JSON.stringify(result).slice(0, 300));
  const post = unwrap(await jsonRequest("/_api/health", "GET", 15_000));
  if (post.paperOnly !== true || post.mode !== "PAPER_ONLY" || post.status !== "OK")
    throw new Error("POST_CYCLE_SAFETY_BLOCK");
  lastSuccess = new Date().toISOString();
  console.log(JSON.stringify({ at:lastSuccess, event:"PAPER_CYCLE", skipped:result.skipped ?? false, markets:result.markets ?? null, errors:result.errors ?? [] }));
}
console.log(JSON.stringify({event:"WORKER_START", mode:"PAPER_ONLY", periodSeconds:60, base:BASE}));
while (!stopping) {
  const started = Date.now();
  try { await tick(); consecutiveFailures = 0; }
  catch (e) {
    consecutiveFailures++;
    console.error(JSON.stringify({at:new Date().toISOString(),event:"CYCLE_ERROR",message:String(e),consecutiveFailures,lastSuccess}));
  }
  const retryDelay = consecutiveFailures ? Math.min(MAX_FAILURE_DELAY_MS, PERIOD_MS * Math.min(consecutiveFailures,2)) : PERIOD_MS;
  const remaining = Math.max(1000, retryDelay - (Date.now() - started));
  if (!stopping) await sleep(remaining);
}
console.log(JSON.stringify({event:"WORKER_STOP",lastSuccess}));
