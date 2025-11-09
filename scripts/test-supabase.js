#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '***' + supabaseKey.slice(-10) : 'NOT FOUND');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Try to query projects table
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('\n⚠️  Tables not created yet!');
        console.log('\n📋 Please create tables manually:');
        console.log('1. Go to: https://ndhxtlhlknahctdfiigu.supabase.co/project/default/sql');
        console.log('2. Copy the SQL from: supabase/schema.sql');
        console.log('3. Paste and click "Run"');
        console.log('\nOr copy-paste this SQL directly:\n');

        const fs = require('fs');
        const path = require('path');
        const schema = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf-8');
        console.log('---START SQL---');
        console.log(schema);
        console.log('---END SQL---');
      } else {
        console.log('❌ Error:', error.message);
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('✅ Tables exist!');
      console.log(`   Found ${data ? data.length : 0} projects`);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

test();
