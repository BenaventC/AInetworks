const http = require('http');

function fetchEnterprises() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/enterprises', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function updateEnterprise(id, updateData, currentData) {
  return new Promise((resolve, reject) => {
    const fullData = {
      name: currentData.name,
      sector: updateData.sector !== undefined ? updateData.sector : currentData.sector,
      country: updateData.country !== undefined ? updateData.country : currentData.country,
      founded_year: updateData.founded_year !== undefined ? updateData.founded_year : currentData.founded_year,
      description: updateData.description !== undefined ? updateData.description : currentData.description,
      website: updateData.website !== undefined ? updateData.website : currentData.website,
      logo_url: updateData.logo_url !== undefined ? updateData.logo_url : (currentData.logo_url || null),
      capitalization: updateData.capitalization !== undefined ? updateData.capitalization : currentData.capitalization,
      employees_count: updateData.employees_count !== undefined ? updateData.employees_count : (currentData.employees_count || null),
    };
    
    const postData = JSON.stringify(fullData);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/enterprises/${id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({ id, status: res.statusCode, response: responseData });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Fetching enterprises...\n');
    const enterprises = await fetchEnterprises();
    const enterpriseMap = {};
    enterprises.forEach(e => enterpriseMap[e.id] = e);
    
    // 01.AI details from Wikipedia
    const update01AI = {
      description: "01.AI est une entreprise chinoise spécialisée dans le développement de modèles de langage open-source. Fondée en mars 2023 par Kai-Fu Lee, ancien cadre chez Microsoft et Google, 01.AI développe la série Yi de modèles d'IA (Yi-34B, Yi-Coder, Yi-Lightning) et l'assistant Wanzhi. L'entreprise a atteint le statut de licorne en novembre 2023 avec une valorisation dépassant 1 milliard de dollars.",
      website: "https://www.01.ai",
      capitalization: "1 milliard USD",
      employees_count: 100
    };
    
    const aiId = 27; // 01.AI ID
    const result = await updateEnterprise(aiId, update01AI, enterpriseMap[aiId]);
    
    console.log(`Updating 01.AI (ID ${aiId}):`);
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${result.response}`);
    
    if (result.status === 200) {
      console.log('\n✓ 01.AI successfully updated with Wikipedia data!');
    } else {
      console.log('\n⚠ Update returned non-200 status');
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
