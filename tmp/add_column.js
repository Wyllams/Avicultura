require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
     console.error('DATABASE_URL is missing in .env');
     process.exit(1);
  }
  
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to DB!');
    
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='StockMovement' AND column_name='syncId';
    `;
    const checkRes = await client.query(checkQuery);
    
    if (checkRes.rows.length === 0) {
      console.log('Column syncId does not exist. Adding...');
      await client.query('ALTER TABLE "StockMovement" ADD COLUMN "syncId" TEXT UNIQUE;');
      console.log('Successfully added column syncId to StockMovement.');
    } else {
      console.log('Column syncId already exists.');
    }
    
  } catch (err) {
    console.error('Error connecting or altering DB:', err);
  } finally {
    await client.end();
  }
}

run();
