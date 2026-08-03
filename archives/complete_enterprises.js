const http = require('http');

// First, fetch all enterprises to get their current data
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

// Updates with complete data
const updates = [
  { id: 2, complete: { description: "Amazon Web Services est la division cloud d'Amazon, leader mondial du cloud computing avec plus de 30% de part de marché. AWS propose des services d'IA et ML via SageMaker.", website: "https://aws.amazon.com", capitalization: "1500 milliards USD", employees_count: 1500000 } },
  { id: 6, complete: { description: "Art Recognition est une entreprise suisse spécialisée dans la vision par ordinateur et la reconnaissance d'images pour l'authentification et l'analyse d'art.", website: "https://www.art-recognition.com", capitalization: "50 millions USD", employees_count: 50 } },
  { id: 7, complete: { description: "Axelera AI développe des processeurs d'IA spécialisés pour l'inférence en edge computing avec une efficacité énergétique optimale.", website: "https://www.axelera.ai", capitalization: "30 millions EUR", employees_count: 120 } },
  { id: 9, complete: { description: "Cohere est une entreprise canadienne qui développe des modèles de langage de large taille (LLM) et des APIs pour traitement du langage naturel.", website: "https://cohere.com", capitalization: "500 millions USD", employees_count: 150 } },
  { id: 10, complete: { description: "DataRobot est une plateforme leader d'IA automatisée qui démocratise le machine learning pour les entreprises de tous les tailles.", website: "https://www.datarobot.com", capitalization: "6 milliards USD", employees_count: 2500 } },
  { id: 11, complete: { sector: "Moteurs de Recherche IA", country: "États-Unis", founded_year: 2022, description: "Perplexity AI est un moteur de recherche conversationnel utilisant l'IA pour fournir des réponses précises et sources.", website: "https://www.perplexity.ai", capitalization: "520 millions USD", employees_count: 50 } },
  { id: 12, complete: { sector: "LLM & Recherche", country: "États-Unis", founded_year: 2015, description: "OpenAI est une organisation de recherche en IA fondée pour assurer que l'intelligence artificielle générale bénéficie à l'humanité.", website: "https://www.openai.com", capitalization: "80 milliards USD", employees_count: 375 } },
  { id: 13, complete: { sector: "CRM & IA", country: "États-Unis", founded_year: 1999, description: "Salesforce est un leader mondial des solutions CRM avec sa plateforme Einstein intégrant l'IA générative.", website: "https://www.salesforce.com", capitalization: "330 milliards USD", employees_count: 80000 } },
  { id: 17, complete: { sector: "GPU & Infrastructure IA", country: "États-Unis", founded_year: 1993, description: "NVIDIA est un leader mondial en processeurs graphiques (GPU) essentiels pour l'IA, le gaming et le calcul haute performance.", website: "https://www.nvidia.com", capitalization: "3000 milliards USD", employees_count: 28000 } },
  { id: 26, complete: { capitalization: "20 milliards USD", employees_count: 100 } },
  { id: 30, complete: { description: "MiniMax développe des modèles multimodaux avancés et des systèmes IA pour le marché chinois.", website: "https://www.minimaxi.com", capitalization: "1 milliard USD", employees_count: 300 } },
  { id: 32, complete: { description: "StepFun développe des modèles de langage open-source et des solutions IA pour le marché chinois.", website: "https://www.stepfun.com", capitalization: "200 millions USD", employees_count: 150 } },
  { id: 33, complete: { description: "Z.ai est une entreprise chinoise développant des modèles de langage avancés et des solutions IA.", website: "https://www.z-ai.com", capitalization: "100 millions USD", employees_count: 80 } },
  { id: 36, complete: { description: "Sidetrade propose des solutions d'IA pour l'automatisation des processus financiers et la gestion du cash-flow.", website: "https://www.sidetrade.com", capitalization: "500 millions EUR", employees_count: 600 } },
  { id: 39, complete: { description: "Linagora développe des solutions collaboratives open-source avec des capacités d'IA intégrées pour les entreprises.", website: "https://linagora.com", capitalization: "50 millions EUR", employees_count: 200 } },
  { id: 40, complete: { description: "Meero est une plateforme française utilisant l'IA pour l'automatisation du traitement d'images et de photos.", website: "https://www.meero.com", capitalization: "100 millions EUR", employees_count: 350 } },
  { id: 41, complete: { description: "MWM AI développe des solutions d'IA pour l'optimisation de la logistique et de la chaîne d'approvisionnement.", website: "https://www.mwm-ai.com", capitalization: "20 millions EUR", employees_count: 80 } },
  { id: 43, complete: { description: "Poolside AI développe des outils d'IA pour la génération de code et l'automatisation du développement logiciel.", website: "https://www.poolside.ai", capitalization: "30 millions USD", employees_count: 50 } },
  { id: 44, complete: { description: "Shift Technology propose des solutions d'IA pour l'automatisation des processus dans le secteur de l'assurance.", website: "https://www.shift-technology.com", capitalization: "500 millions EUR", employees_count: 700 } },
  { id: 46, complete: { description: "Lovable est une plateforme suédoise permettant de créer des applications web avec l'aide de l'IA générative.", website: "https://lovable.dev", capitalization: "50 millions USD", employees_count: 50 } },
];

function updateEnterprise(id, updateData, currentData) {
  return new Promise((resolve, reject) => {
    // Merge current data with updates
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
        resolve({ id, status: res.statusCode });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Fetching current enterprise data...');
    const enterprises = await fetchEnterprises();
    const enterpriseMap = {};
    enterprises.forEach(e => enterpriseMap[e.id] = e);
    
    console.log('Starting enterprise updates...\n');
    
    for (const update of updates) {
      if (enterpriseMap[update.id]) {
        try {
          const result = await updateEnterprise(update.id, update.complete, enterpriseMap[update.id]);
          console.log(`✓ Enterprise ${update.id} (${enterpriseMap[update.id].name}): ${result.status}`);
        } catch (error) {
          console.log(`✗ Enterprise ${update.id}: Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n✓ All updates completed!');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
