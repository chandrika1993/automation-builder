// Builds the static live demo into out/ (see src/demo).
import { execSync } from "node:child_process";

execSync("next build", {
  stdio: "inherit",
  env: { ...process.env, DEMO_EXPORT: "1", NEXT_PUBLIC_DEMO: "1" },
});

console.log("Demo build ready in out/");
