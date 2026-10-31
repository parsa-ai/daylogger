// Usage: pnpm cron:tick [base-url]   (default http://localhost:3000)
// Runs one scheduler tick by calling /api/cron with the CRON_SECRET, exactly
// like the external pinger does. Handy for local testing and for checking prod.
import "dotenv/config";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is not set (.env or environment)");
  process.exit(1);
}

const res = await fetch(new URL("/api/cron", baseUrl), { headers: { authorization: `Bearer ${secret}` } });
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
