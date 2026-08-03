const http = require('http');

// Fetch all enterprises
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

// Update enterprise
function updateEnterprise(id, updateData, currentData) {
  return new Promise((resolve, reject) => {
    const fullData = {
      name: currentData.name,
      sector: updateData.sector || currentData.sector,
      country: updateData.country || currentData.country,
      founded_year: updateData.founded_year || currentData.founded_year,
      description: updateData.description || currentData.description,
      website: updateData.website || currentData.website,
      logo_url: updateData.logo_url || currentData.logo_url,
      capitalization: updateData.capitalization || currentData.capitalization,
      employees_count: updateData.employees_count !== undefined ? updateData.employees_count : currentData.employees_count,
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
    
    // Find incomplete enterprises
    const incomplete = enterprises.filter(e => 
      !e.description || !e.website || !e.capitalization || !e.employees_count
    );
    
    console.log(`Found ${incomplete.length} incomplete enterprises:\n`);
    incomplete.forEach(e => {
      const missing = [];
      if (!e.description) missing.push('description');
      if (!e.website) missing.push('website');
      if (!e.capitalization) missing.push('capitalization');
      if (!e.employees_count) missing.push('employees_count');
      console.log(`ID ${e.id}: ${e.name} - Missing: ${missing.join(', ')}`);
    });
    
    console.log('\n--- Now updating incomplete enterprises ---\n');
    
    // Build updates based on the actual incomplete enterprises
    const updates = {
      3: { description: "Mistral AI développe des modèles de langage open-source et des APIs pour la génération de texte.", website: "https://www.mistral.ai" },
      4: { description: "Anthropic est un laboratoire de recherche en IA fondé pour développer des systèmes d'IA sûrs et bénéfiques.", website: "https://www.anthropic.com", capitalization: "5 milliards USD", employees_count: 200 },
      14: { description: "Google est un géant technologique investissant massivement dans l'IA générative avec ses modèles Gemini.", website: "https://www.google.com", capitalization: "1800 milliards USD", employees_count: 190000 },
      15: { description: "IBM est une entreprise technologique spécialisée en cloud et IA pour les solutions d'entreprise.", website: "https://www.ibm.com", capitalization: "210 milliards USD", employees_count: 282000 },
      16: { description: "Meta investit massivement dans l'IA générative avec ses modèles Llama et applications IA intégrées dans ses réseaux.", website: "https://www.meta.com", capitalization: "600 milliards USD", employees_count: 70000 },
    };
    
    for (const [id, update] of Object.entries(updates)) {
      const enterpriseId = parseInt(id);
      const enterprise = enterprises.find(e => e.id === enterpriseId);
      if (enterprise) {
        try {
          const result = await updateEnterprise(enterpriseId, update, enterprise);
          console.log(`✓ ID ${enterpriseId} (${enterprise.name}): ${result.status}`);
        } catch (error) {
          console.log(`✗ ID ${enterpriseId}: Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n✓ Updates completed!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
