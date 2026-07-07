/**
 * V1-STEP 10 — new-tenant onboarding CLI.
 *
 * Provisions a brand-new tenant (branding, first admin, category taxonomy,
 * seed products incl. variants) through the shared, reusable
 * TenantsService.provisionTenant() — the same path the seeder uses. New
 * tenants default to simpleMode=true.
 *
 * Usage (inside the running server container):
 *   docker compose exec -T server node dist/scripts/onboard-tenant.js < spec.json
 *   docker compose exec server node dist/scripts/onboard-tenant.js /path/spec.json
 *
 * The spec is JSON matching ProvisionTenantSpec. Integration credentials
 * (SSLCommerz / Steadfast / WhatsApp) are NOT part of onboarding — they are
 * added later via the admin credentials endpoint (encrypted at rest).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  TenantsService,
  ProvisionTenantSpec,
} from '../modules/tenants/tenants.service';
import * as fs from 'fs';

function readSpec(): ProvisionTenantSpec {
  const pathArg = process.argv[2];
  const raw = pathArg
    ? fs.readFileSync(pathArg, 'utf8')
    : fs.readFileSync(0, 'utf8'); // fd 0 = stdin
  if (!raw.trim()) {
    throw new Error('No tenant spec provided (pass a file path or pipe JSON on stdin)');
  }
  return JSON.parse(raw) as ProvisionTenantSpec;
}

async function main() {
  const spec = readSpec();
  if (!spec.name || !spec.slug || !spec.admin?.email) {
    throw new Error('Spec must include at least: name, slug, admin.email, admin.password');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const tenants = app.get(TenantsService);
    const tenant = await tenants.provisionTenant(spec);
    // eslint-disable-next-line no-console
    console.log(
      `\n✅ Tenant provisioned: ${tenant.name} (slug=${tenant.slug}, id=${tenant.id}, simpleMode=${tenant.simpleMode})`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(`\n❌ Onboarding failed: ${err.message}`);
  process.exit(1);
});
