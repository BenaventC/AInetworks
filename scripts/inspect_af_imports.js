const { openDb } = require('./lib/db');

async function checkSample() {
  const db = openDb();
  const sample = await db.all('SELECT id, name, country, headquarter_city, sector, organization_type, is_validated, sector_domains FROM enterprises WHERE name IN (?, ?, ?, ?, ?)', ['iFlytek', 'WPP', 'Horizon Robotics', 'Jellysmack', 'Twilio']);
  console.log('Sample imported records in DB:', sample);
  await db.close();
}

checkSample().catch(console.error);



