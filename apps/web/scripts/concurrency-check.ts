const CONCURRENT_REQUESTS = 10;
const ENDPOINT = "http://localhost:3000/api/v1/health";

async function makeRequest(index: number): Promise<{ index: number; status: number; latency: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(ENDPOINT, { signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { index, status: res.status, latency };
  } catch (e) {
    return { index, status: 0, latency: Date.now() - start };
  }
}

(async () => {
  console.log(`Sending ${CONCURRENT_REQUESTS} concurrent requests to ${ENDPOINT}...`);
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => makeRequest(i + 1))
  );
  const totalTime = Date.now() - start;

  const statuses = results.map(r => r.status);
  const successCount = statuses.filter(s => s === 200).length;
  const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latency, 0) / results.length);
  const maxLatency = Math.max(...results.map(r => r.latency));

  console.log(`\nResults:`);
  console.log(`  Total time: ${totalTime}ms`);
  console.log(`  Success: ${successCount}/${CONCURRENT_REQUESTS}`);
  console.log(`  Avg latency: ${avgLatency}ms`);
  console.log(`  Max latency: ${maxLatency}ms`);
  results.forEach(r => {
    console.log(`  Request ${r.index}: status=${r.status}, latency=${r.latency}ms`);
  });
  if (successCount === CONCURRENT_REQUESTS) {
    console.log("\n✓ All concurrent requests succeeded");
  } else {
    console.log("\n✗ Some requests failed");
  }
})().catch(console.error);
