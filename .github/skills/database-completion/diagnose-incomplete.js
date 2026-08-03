#!/usr/bin/env node

/**
 * Diagnostic Script: Identifier les entreprises incomplètes
 * Usage: node diagnose-incomplete.js
 * 
 * Affiche:
 * - Nombre total d'entreprises
 * - Nombre d'entreprises incomplètes
 * - Détail des champs manquants par entreprise
 * - Taux de complétude
 */

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

function isFieldComplete(value) {
  return value && value.toString().trim() !== '';
}

async function diagnoseIncomplete() {
  try {
    console.log('\n=== Diagnostic Base de Données ===\n');
    
    const enterprises = await fetchEnterprises();
    
    // Critères de complétude
    const requiredFields = ['description', 'website', 'capitalization'];
    const optionalFields = ['employees_count'];
    
    const incomplete = enterprises.filter(e => 
      requiredFields.some(field => !isFieldComplete(e[field]))
    );
    
    const complete = enterprises.filter(e =>
      requiredFields.every(field => isFieldComplete(e[field]))
    );
    
    // Statistiques
    console.log(`📊 Statistiques Générales`);
    console.log(`  Total d'entreprises: ${enterprises.length}`);
    console.log(`  Complètes: ${complete.length} (${(complete.length/enterprises.length*100).toFixed(1)}%)`);
    console.log(`  Incomplètes: ${incomplete.length} (${(incomplete.length/enterprises.length*100).toFixed(1)}%)`);
    
    // Détail des incomplètes
    console.log(`\n📋 Entreprises Incomplètes (${incomplete.length}):\n`);
    
    incomplete.forEach((e, index) => {
      const missingFields = [];
      
      if (!isFieldComplete(e.description)) missingFields.push('description');
      if (!isFieldComplete(e.website)) missingFields.push('website');
      if (!isFieldComplete(e.capitalization)) missingFields.push('capitalization');
      if (!isFieldComplete(e.employees_count)) missingFields.push('employees_count');
      
      console.log(`${index + 1}. ${e.name} (ID: ${e.id})`);
      console.log(`   Secteur: ${e.sector || '❌'} | Pays: ${e.country || '❌'} | Année: ${e.founded_year || '❌'}`);
      console.log(`   Champs manquants: ${missingFields.join(', ')}`);
      console.log('');
    });
    
    // Résumé par champ
    console.log(`\n📈 Résumé par Champ:\n`);
    
    const descriptionComplete = enterprises.filter(e => isFieldComplete(e.description)).length;
    const websiteComplete = enterprises.filter(e => isFieldComplete(e.website)).length;
    const capitalizationComplete = enterprises.filter(e => isFieldComplete(e.capitalization)).length;
    const employeesComplete = enterprises.filter(e => isFieldComplete(e.employees_count)).length;
    
    console.log(`  Description: ${descriptionComplete}/${enterprises.length} (${(descriptionComplete/enterprises.length*100).toFixed(1)}%)`);
    console.log(`  Site Web: ${websiteComplete}/${enterprises.length} (${(websiteComplete/enterprises.length*100).toFixed(1)}%)`);
    console.log(`  Capitalisation: ${capitalizationComplete}/${enterprises.length} (${(capitalizationComplete/enterprises.length*100).toFixed(1)}%)`);
    console.log(`  Employés: ${employeesComplete}/${enterprises.length} (${(employeesComplete/enterprises.length*100).toFixed(1)}%)`);
    
    // Prioriser les entreprises à compléter (les plus importantes d'abord)
    console.log(`\n🎯 Priorisation pour Complétion:\n`);
    
    const byMissingCount = incomplete
      .map(e => ({
        id: e.id,
        name: e.name,
        missingCount: requiredFields.filter(f => !isFieldComplete(e[f])).length
      }))
      .sort((a, b) => b.missingCount - a.missingCount);
    
    byMissingCount.slice(0, 10).forEach((e, index) => {
      console.log(`${index + 1}. ${e.name} (ID: ${e.id}) - ${e.missingCount} champs manquants`);
    });
    
    console.log('\n=== Fin Diagnostic ===\n');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

diagnoseIncomplete();
