const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const dbUrl = process.env.DATABASE_URL;
console.log('Database URL exists:', !!dbUrl);

if (!dbUrl) {
  console.log('No DATABASE_URL found in .env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Attempting to query table schema...');
    
    // Check if notes table exists
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log('Tables in public schema:', tables);

    // If notes table exists, check its columns
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes';
    `;
    console.log('Columns in "notes" table:', columns);

    // Try to run ALTER TABLE to add folder column
    console.log('Running ALTER TABLE to add "folder" column...');
    await sql`
      ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder VARCHAR(100) DEFAULT 'Umum';
    `;
    console.log('ALTER TABLE completed successfully!');

    // Re-check columns
    const updatedColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes';
    `;
    console.log('Updated columns in "notes" table:', updatedColumns);
  } catch (error) {
    console.error('Error during database check/migration:', error);
  }
}

run();
