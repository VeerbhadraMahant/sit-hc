// Run SQL against the Supabase project via the Management API.
//   node scripts/db.mjs "select 1"
//   node scripts/db.mjs --file supabase/migrations/0001_init.sql
// Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env.local.
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) {
  console.error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF in .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const query = args[0] === "--file" ? readFileSync(args[1], "utf8") : args.join(" ");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
