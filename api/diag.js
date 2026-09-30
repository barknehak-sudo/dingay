// Temporary: can this region reach the telebirr receipt service?
export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    const r = await fetch('https://transactioninfo.ethiotelecom.et/receipt/DIU6AMQUGM', { signal: AbortSignal.timeout(25000), headers: { 'user-agent': 'Mozilla/5.0' } });
    const t = await r.text();
    res.json({ region: process.env.VERCEL_REGION, ok: r.status, ms: Date.now() - t0, found: t.includes('DIU6AMQUGM') });
  } catch (e) {
    res.json({ region: process.env.VERCEL_REGION, error: String(e.cause?.code || e.message), ms: Date.now() - t0 });
  }
}
