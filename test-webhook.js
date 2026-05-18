async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/webhooks/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 1, idempotencyKey: 'test_' + Date.now() })
    });
    const data = await res.json();
    console.log("Status:", res.status, data);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
test();
