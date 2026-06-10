require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { rootPool } = require('./dbConfig');

async function initializeDatabase() {
  try {
    console.log('Connecting to MySQL...');
    // Create database
    const dbName = process.env.DB_NAME || 'dorado_pos';
    await rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database '${dbName}' created or already exists.`);
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons for multiple statements
    const statements = schemaSql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    console.log(`Executing ${statements.length} schema statements...`);
    
    for (const statement of statements) {
      if(statement) {
        await rootPool.query(statement);
      }
    }
    
    console.log('Schema initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
