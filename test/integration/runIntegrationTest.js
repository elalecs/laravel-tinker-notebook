#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { runTests } = require('@vscode/test-electron');

async function main() {
  try {
    
    // El directorio raíz de la extensión
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    
    // Ruta al archivo JavaScript de prueba
    const extensionTestsPath = path.resolve(__dirname, './integration.test.js');
    
    // Directorio temporal para los archivos de prueba
    const testWorkspace = path.resolve(__dirname, '../../test-workspace');
    
    console.log('\n=============================================');
    console.log('Iniciando pruebas de integración con VSCode...');
    console.log('=============================================');
    console.log(`Extensión: ${extensionDevelopmentPath}`);
    console.log(`Pruebas: ${extensionTestsPath}`);
    console.log(`Workspace: ${testWorkspace}`);
    
    // Asegurarse de que el directorio de workspace existe
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Crear un archivo de Laravel de ejemplo para las pruebas
    const laravelTestDir = path.join(testWorkspace, 'laravel-project');
    if (!fs.existsSync(laravelTestDir)) {
      fs.mkdirSync(laravelTestDir, { recursive: true });
      // Crear un archivo artisan falso para simular un proyecto Laravel
      fs.writeFileSync(path.join(laravelTestDir, 'artisan'), '#!/usr/bin/env php\n<?php\n// Este es un archivo artisan falso para pruebas');
    }
    
    // Descargar VS Code, descomprimirlo y ejecutar las pruebas
    await runTests({
      // Versión de VS Code a usar para las pruebas
      version: 'stable',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace]
    });
    
    console.log('\n✅ Pruebas de integración completadas con éxito');
    console.log('\n=============================================');
    console.log('Las pruebas de integración pasaron correctamente');
    console.log('=============================================\n');
  } catch (err) {
    console.error('\n❌ Error al ejecutar las pruebas:', err);
    process.exit(1);
  }
}

main();
