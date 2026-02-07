/**
 * OpenAPI Spec Verification Script
 *
 * Reads the hand-maintained OpenAPI spec from /api/admin/docs route
 * and checks that each documented path corresponds to an actual route file.
 *
 * Usage: npm run verify:api-docs
 */

import * as fs from "fs";
import * as path from "path";

const ROUTES_DIR = path.resolve(__dirname, "../src/app/api");
const SPEC_FILE = path.resolve(__dirname, "../src/app/api/admin/docs/route.ts");

// Map OpenAPI path patterns to filesystem route patterns
function apiPathToRoutePath(apiPath: string): string[] {
  // /api/reports/{id}/pdf -> api/reports/[id]/pdf
  const normalized = apiPath
    .replace(/^\//, "")
    .replace(/\{([^}]+)\}/g, "[$1]");

  // The route file could be route.ts at different levels
  return [
    path.join(ROUTES_DIR, normalized.replace(/^api\//, ""), "route.ts"),
  ];
}

function extractPathsFromSpec(content: string): string[] {
  const pathRegex = /"(\/api\/[^"]+)":\s*\{/g;
  const paths: string[] = [];
  let match;
  while ((match = pathRegex.exec(content)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

async function main() {
  console.log("Verifying OpenAPI spec against route files...\n");

  // Read the spec source file
  if (!fs.existsSync(SPEC_FILE)) {
    console.error(`Spec file not found: ${SPEC_FILE}`);
    process.exit(1);
  }

  const specContent = fs.readFileSync(SPEC_FILE, "utf-8");
  const documentedPaths = extractPathsFromSpec(specContent);

  console.log(`Found ${documentedPaths.length} documented API paths\n`);

  let missing = 0;
  let found = 0;

  for (const apiPath of documentedPaths) {
    const possibleRoutes = apiPathToRoutePath(apiPath);
    const exists = possibleRoutes.some((routePath) => fs.existsSync(routePath));

    if (exists) {
      console.log(`  OK  ${apiPath}`);
      found++;
    } else {
      console.log(`  MISSING  ${apiPath}`);
      console.log(`    Expected: ${possibleRoutes[0]}`);
      missing++;
    }
  }

  // Also check for undocumented routes
  console.log("\nChecking for undocumented routes...\n");
  const allRouteFiles = findRouteFiles(ROUTES_DIR);
  const documentedSet = new Set(
    documentedPaths.map((p) =>
      p.replace(/^\/api\//, "").replace(/\{([^}]+)\}/g, "[$1]")
    )
  );

  let undocumented = 0;
  for (const routeFile of allRouteFiles) {
    const relative = path.relative(ROUTES_DIR, path.dirname(routeFile));
    // Skip internal/cron/webhook routes that don't need public docs
    if (
      relative.startsWith("cron") ||
      relative.startsWith("webhooks") ||
      relative.startsWith("sync") ||
      relative === "admin" + path.sep + "docs" ||
      relative === "admin" + path.sep + "email-events"
    ) {
      continue;
    }

    if (!documentedSet.has(relative.replace(/\\/g, "/"))) {
      console.log(`  UNDOCUMENTED  /api/${relative.replace(/\\/g, "/")}`);
      undocumented++;
    }
  }

  // Summary
  console.log("\n--- Summary ---");
  console.log(`Documented paths: ${documentedPaths.length}`);
  console.log(`Route files found: ${found}`);
  console.log(`Missing route files: ${missing}`);
  console.log(`Undocumented routes: ${undocumented}`);

  if (missing > 0) {
    console.log("\nWARNING: Some documented API paths have no matching route file.");
    process.exit(1);
  }

  console.log("\nAll documented API paths have matching route files.");
}

function findRouteFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry.name === "route.ts") {
      results.push(fullPath);
    }
  }

  return results;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
