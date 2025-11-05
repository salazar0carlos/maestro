#!/usr/bin/env node

/**
 * Setup Supabase Database
 * Creates tables for Maestro production deployment
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🚀 Setting up Maestro database...\n');

  try {
    // Read SQL schema file
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📄 Running SQL schema...');

    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      // Skip DO blocks and other complex statements for now
      if (statement.startsWith('DO $$') || statement.includes('RAISE NOTICE')) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.log(`⚠️  Statement may have failed (might be okay):`, error.message);
        }
      } catch (err) {
        // Try direct query for table creation
        if (statement.includes('CREATE TABLE')) {
          console.log('   Creating table...');
        }
      }
    }

    // Verify tables exist by querying them
    console.log('\n✅ Verifying database setup...');

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(0);

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('count')
      .limit(0);

    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('count')
      .limit(0);

    if (!projectsError && !tasksError && !agentsError) {
      console.log('   ✅ projects table: Ready');
      console.log('   ✅ tasks table: Ready');
      console.log('   ✅ agents table: Ready');
      console.log('\n🎉 Database setup complete!');
      console.log('\nNext steps:');
      console.log('1. Restart Next.js: npm run dev');
      console.log('2. Open http://localhost:3000');
      console.log('3. Your data will now sync with Supabase!');
    } else {
      console.log('\n⚠️  Some tables might need manual creation.');
      console.log('Please run the SQL in supabase/schema.sql manually in Supabase SQL Editor:');
      console.log('https://ndhxtlhlknahctdfiigu.supabase.co/project/default/sql');
    }

  } catch (error) {
    console.error('\n❌ Error setting up database:', error.message);
    console.log('\n📝 Please run the SQL manually in Supabase SQL Editor:');
    console.log('1. Go to: https://ndhxtlhlknahctdfiigu.supabase.co/project/default/sql');
    console.log('2. Copy the contents of supabase/schema.sql');
    console.log('3. Paste and run in the SQL Editor');
  }
}

setupDatabase();
