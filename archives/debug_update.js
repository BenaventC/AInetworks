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
    
    // Test with first failing enterprise
    const testId = 7; // Hugging Face
    const testUpdate = { 
      description: "Hugging Face est la plateforme open-source leader pour les modèles d'IA et ML.", 
      website: "https://huggingface.co", 
      capitalization: "4 milliards USD", 
      employees_count: 300 
    };
    
    const result = await updateEnterprise(testId, testUpdate, enterpriseMap[testId]);
    console.log(`Test update for ID ${testId}:`);
    console.log(`Status: ${result.status}`);
    console.log(`Response: ${result.response}\n`);
    
    if (result.status === 200) {
      console.log('✓ Update successful!');
    } else {
      console.log('Update failed. Trying with minimal data...');
      
      // Try with only description
      const minimalResult = await updateEnterprise(testId, { description: testUpdate.description }, enterpriseMap[testId]);
      console.log(`\nMinimal update (description only):`);
      console.log(`Status: ${minimalResult.status}`);
      console.log(`Response: ${minimalResult.response}`);
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
