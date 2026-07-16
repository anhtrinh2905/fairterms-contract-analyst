// Regenerate lib/api/generated-types.ts from the FastAPI OpenAPI schema.
// Requires the backend deps installed (uv) — run from src/frontend:
//   npm run gen:api-types
// The hand-written interfaces in lib/api/types.ts must stay in sync with
// the generated schema; use this file as the source of truth when they drift.
import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tmp = mkdtempSync(join(tmpdir(), "fairterms-openapi-"));
const schemaPath = join(tmp, "openapi.json");

execSync(
  `uv run python -c "import json; from app.main import app; json.dump(app.openapi(), open('${schemaPath}','w'), ensure_ascii=False)"`,
  { cwd: "../backend", stdio: "inherit" },
);
execSync(`npx openapi-typescript ${schemaPath} -o lib/api/generated-types.ts`, {
  stdio: "inherit",
});
console.log("lib/api/generated-types.ts regenerated");
