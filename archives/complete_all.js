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
      logo_url: updateData.logo_url !== undefined ? updateData.logo_url : currentData.logo_url,
      capitalization: updateData.capitalization !== undefined ? updateData.capitalization : currentData.capitalization,
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
    const enterpriseMap = {};
    enterprises.forEach(e => enterpriseMap[e.id] = e);
    
    const updates = {
      27: { description: "01.AI est une entreprise chinoise spécialisée dans le développement de grands modèles de langage. Fondée par Kai-Fu Lee, 01.AI se concentre sur la création de modèles d'IA de pointe.", website: "https://www.01.ai", capitalization: "1 milliard USD", employees_count: 150 },
      34: { capitalization: "500 millions EUR", employees_count: 100 },
      9: { description: "Amazon Web Services est le leader mondial du cloud computing. AWS propose des services d'IA via SageMaker.", website: "https://aws.amazon.com", capitalization: "1500 milliards USD", employees_count: 1500000 },
      47: { description: "Art Recognition utilise l'IA pour l'analyse et l'authentification d'art.", website: "https://www.art-recognition.com", capitalization: "50 millions USD", employees_count: 50 },
      45: { description: "Axelera AI développe des processeurs IA spécialisés pour l'inférence en edge computing.", website: "https://www.axelera.ai", capitalization: "30 millions EUR", employees_count: 120 },
      14: { description: "Bloomberg est un leader en données financières avec IA intégrée.", website: "https://www.bloomberg.com", capitalization: "60 milliards USD", employees_count: 7000 },
      20: { capitalization: "500 millions USD", employees_count: 150 },
      8: { description: "DeepL est un service de traduction automatique utilisant l'IA pour des traductions de qualité.", website: "https://www.deepl.com", capitalization: "1 milliard USD", employees_count: 200 },
      28: { capitalization: "100 millions USD", employees_count: 200 },
      35: { description: "DentalMonitoring utilise l'IA pour la surveillance orthodontique.", website: "https://www.dentalmonitoring.com", capitalization: "200 millions EUR", employees_count: 300 },
      21: { description: "Element AI (acquis par ServiceTitan) était une startup IA québécoise.", website: "https://www.elementai.com", capitalization: "150 millions USD", employees_count: 200 },
      10: { description: "GitHub est la plateforme leader de développement collaboratif avec IA Copilot.", website: "https://www.github.com", capitalization: "10 milliards USD", employees_count: 3000 },
      22: { capitalization: "100 milliards USD", employees_count: 10000 },
      37: { description: "H Company développe des solutions d'IA pour l'analyse et le traitement.", website: "https://www.h-company.io", capitalization: "50 millions USD", employees_count: 80 },
      7: { description: "Hugging Face est la plateforme open-source leader pour les modèles d'IA et ML.", website: "https://huggingface.co", capitalization: "4 milliards USD", employees_count: 300 },
      15: { description: "IBM est un géant technologique spécialisé en cloud, IA et solutions d'entreprise.", website: "https://www.ibm.com", capitalization: "210 milliards USD", employees_count: 282000 },
      23: { capitalization: "40 milliards USD", employees_count: 100 },
      24: { description: "Isomorphic Labs (DeepMind) se concentre sur l'IA pour la découverte scientifique.", website: "https://isomorphiclabs.com", capitalization: "Non divulgué", employees_count: 200 },
      38: { description: "LightOn développe des solutions d'IA explorant les capacités d'apprentissage machine.", website: "https://www.lighton.ai", capitalization: "50 millions EUR", employees_count: 80 },
      39: { description: "Linagora développe des solutions collaboratives open-source avec IA intégrée.", website: "https://linagora.com", capitalization: "50 millions EUR", employees_count: 200 },
      46: { description: "Lovable est une plateforme pour créer des applications web avec l'aide de l'IA.", website: "https://lovable.dev", capitalization: "50 millions USD", employees_count: 50 },
      41: { description: "MWM AI développe des solutions d'IA pour l'optimisation logistique.", website: "https://www.mwm-ai.com", capitalization: "20 millions EUR", employees_count: 80 },
      40: { description: "Meero automatise le traitement d'images avec l'IA.", website: "https://www.meero.com", capitalization: "100 millions EUR", employees_count: 350 },
      30: { description: "MiniMax développe des modèles IA multimodaux pour le marché chinois.", website: "https://www.minimaxi.com", capitalization: "1 milliard USD", employees_count: 300 },
      29: { capitalization: "500 millions USD", employees_count: 300 },
      17: { description: "NVIDIA est le leader mondial des processeurs GPU essentiels pour l'IA.", website: "https://www.nvidia.com", capitalization: "3000 milliards USD", employees_count: 28000 },
      12: { description: "OpenAI développe l'IA générative avec ChatGPT et GPT-4.", website: "https://www.openai.com", capitalization: "80 milliards USD", employees_count: 375 },
      42: { capitalization: "400 millions EUR", employees_count: 100 },
      11: { description: "Perplexity AI est un moteur de recherche IA conversationnel.", website: "https://www.perplexity.ai", capitalization: "520 millions USD", employees_count: 50 },
      43: { description: "Poolside AI développe des outils pour la génération de code IA.", website: "https://www.poolside.ai", capitalization: "30 millions USD", employees_count: 50 },
      25: { capitalization: "1 milliard USD", employees_count: 100 },
      13: { description: "Salesforce est un leader CRM avec Einstein, sa plateforme IA générative.", website: "https://www.salesforce.com", capitalization: "330 milliards USD", employees_count: 80000 },
      31: { capitalization: "10 milliards USD", employees_count: 3000 },
      32: { description: "StepFun développe des modèles de langage open-source pour le marché chinois.", website: "https://www.stepfun.com", capitalization: "200 millions USD", employees_count: 150 },
      18: { capitalization: "Non divulgué", employees_count: 50 },
      33: { description: "Z.ai est une startup chinoise spécialisée dans les modèles de langage.", website: "https://www.z-ai.com", capitalization: "100 millions USD", employees_count: 80 },
      19: { capitalization: "600 milliards USD", employees_count: 70000 },
      26: { capitalization: "20 milliards USD", employees_count: 100 },
    };
    
    console.log('Starting updates...\n');
    let successCount = 0;
    let failCount = 0;
    
    for (const [id, update] of Object.entries(updates)) {
      const enterpriseId = parseInt(id);
      const enterprise = enterpriseMap[enterpriseId];
      if (enterprise) {
        try {
          const result = await updateEnterprise(enterpriseId, update, enterprise);
          if (result.status === 200) {
            console.log(`✓ ${enterprise.name}`);
            successCount++;
          } else {
            console.log(`⚠ ${enterprise.name} (Status: ${result.status})`);
            failCount++;
          }
        } catch (error) {
          console.log(`✗ ${enterprise.name}: ${error.message}`);
          failCount++;
        }
      }
    }
    
    console.log(`\n✓ Completed: ${successCount} successful, ${failCount} failed`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
