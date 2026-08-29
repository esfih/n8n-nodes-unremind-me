// Runs the ACTUAL n8n verification gate against the local working tree.
//
// Why not a hand-written eslint config: the gate is
// `npx @n8n/scan-community-package <pkg>`, which composes TWO plugins
// (@n8n/eslint-plugin-community-nodes plus eslint-plugin-n8n-nodes-base) with
// a specific set of rule overrides. A local config that merely *resembles*
// that composition is worse than useless — v0.1.4 passed a local lint built on
// only one of those plugins, then failed automated review on six errors. So
// this imports the scanner's own analyzer and its own file patterns rather
// than reimplementing them; when n8n changes the rules, bumping the
// devDependency picks the change up with no edit here.
//
// Difference from the published gate: this lints the working tree, so it can
// run BEFORE publishing. The gate additionally checks npm provenance and that
// the tarball matches the attested source — neither is knowable pre-publish.
import { analyzePackage, SOURCE_FILE_PATTERNS } from '@n8n/scan-community-package/scanner/scanner.mjs';

const result = await analyzePackage(process.cwd(), SOURCE_FILE_PATTERNS);

if (result.passed) {
  console.log('✅ Local source passes the n8n community-node scan');
  process.exit(0);
}

console.error(`❌ ${result.message}`);
if (result.details) console.error(`\n${result.details}`);
process.exit(1);
