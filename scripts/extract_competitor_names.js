const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.db');

// Extraire tous les noms d'entreprises
db.all('SELECT name FROM enterprises ORDER BY name', (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  
  const allNames = new Set();
  rows.forEach(r => allNames.add(r.name));
  
  // Extraire tous les concurrents mentionnés
  db.all('SELECT main_competitors FROM enterprises WHERE main_competitors IS NOT NULL AND main_competitors != ""', (err2, rows2) => {
    if (err2) {
      console.error(err2);
      db.close();
      return;
    }
    
    const competitorCounts = {};
    
    rows2.forEach(r => {
      const competitors = r.main_competitors.split(/[,;]+/).map(c => c.trim()).filter(Boolean);
      competitors.forEach(comp => {
        // Enlever les parenthèses pour le comptage
        const cleanName = comp.replace(/\s*\([^)]*\)/g, '').trim();
        if (cleanName && cleanName.toLowerCase() !== 'na' && cleanName.toLowerCase() !== 'n/a') {
          competitorCounts[cleanName] = (competitorCounts[cleanName] || 0) + 1;
        }
      });
    });
    
    // Trier par fréquence
    const sorted = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);
    
    console.log('=== Top 100 concurrents les plus cités ===');
    sorted.forEach(([name, count]) => {
      const isInDb = allNames.has(name);
      console.log(`${count.toString().padStart(4)} × ${name}${isInDb ? '' : ' [EXTERNE]'}`);
    });
    
    // Identifier les variations possibles
    console.log('\n=== Variations potentielles à harmoniser ===');
    const nameGroups = {};
    
    sorted.forEach(([name]) => {
      const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!nameGroups[normalized]) {
        nameGroups[normalized] = [];
      }
      nameGroups[normalized].push(name);
    });
    
    Object.entries(nameGroups).forEach(([key, names]) => {
      if (names.length > 1) {
        console.log(`${key}: ${names.join(' | ')}`);
      }
    });
    
    db.close();
  });
});
