const { Pool } = require('pg');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    console.log('Adding custom_payout column to publisher_offers table...');
    await pool.query(`
      ALTER TABLE publisher_offers 
      ADD COLUMN IF NOT EXISTS custom_payout NUMERIC(10,2)
    `);
    console.log('SUCCESS: Column added successfully');
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
