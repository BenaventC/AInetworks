const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.all(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as with_country,
    COUNT(CASE WHEN country IS NULL OR country = '' THEN 1 END) as without_country
  FROM enterprises
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    process.exit(1);
  }
  console.log('ENTERPRISES:', rows[0]);
  
  db.all(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as with_country,
      COUNT(CASE WHEN country IS NULL OR country = '' THEN 1 END) as without_country
    FROM investors
  `, (err2, rows2) => {
    if (err2) {
      console.error('Error:', err2);
      db.close();
      process.exit(1);
    }
    console.log('INVESTORS:', rows2[0]);
    
    // Show sample countries
    db.all(`SELECT DISTINCT country FROM enterprises WHERE country IS NOT NULL AND country != '' LIMIT 10`, (err3, rows3) => {
      console.log('\nSample countries from enterprises:', rows3.map(r => r.country));
      db.close();
    });
  });
});
