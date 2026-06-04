import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const ROLES = [
  { 
    role: 'admin',      
    email: process.env.TEST_ADMIN_EMAIL,      
    password: process.env.TEST_ADMIN_PASSWORD,      
    file: 'tests/.auth/admin.json' 
  },
  { 
    role: 'agency',     
    email: process.env.TEST_AGENCY_EMAIL,     
    password: process.env.TEST_AGENCY_PASSWORD,     
    file: 'tests/.auth/agency.json' 
  },
  { 
    role: 'post_sales', 
    email: process.env.TEST_POST_SALES_EMAIL, 
    password: process.env.TEST_POST_SALES_PASSWORD, 
    file: 'tests/.auth/post_sales.json' 
  },
];

export default async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();

  console.log('🚀 Starting global setup (authentication)...');

  for (const { role, email, password, file } of ROLES) {
    if (!email || !password) {
      console.warn(`⚠️ Skipping login for ${role} (missing credentials in .env)`);
      continue;
    }

    console.log(`🔑 Logging in as ${role}...`);
    const page = await browser.newPage();

    try {
      // Login via UI
      await page.goto(`${baseURL}/login`);
      await page.fill('[name=email]', email);
      await page.fill('[name=password]', password);
      await page.click('[type=submit]');
      
      // Wait for dashboard redirect
      await page.waitForURL(/\/(admin|agency|seller|student)\/dashboard/, { timeout: 15000 });

      // Save storageState (localStorage + cookies)
      await page.context().storageState({ path: file });
      console.log(`✅ Session saved for ${role}`);
    } catch (error) {
      console.error(`❌ Failed to login as ${role}:`, error);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('🏁 Global setup finished.');
}
