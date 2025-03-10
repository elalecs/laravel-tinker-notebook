import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // El directorio raíz de la extensión
    const extensionDevelopmentPath = path.resolve(__dirname, '../');
    
    // Ruta al archivo JavaScript de prueba (no al directorio)
    const extensionTestsPath = path.resolve(__dirname, './simpleTest.js');
    
    // Directorio temporal para los archivos de prueba
    const testWorkspace = path.resolve(__dirname, '../test-workspace');
    
    console.log('Starting integration tests...');
    console.log(`Extension: ${extensionDevelopmentPath}`);
    console.log(`Tests: ${extensionTestsPath}`);
    console.log(`Workspace: ${testWorkspace}`);
    
    // Asegurarse de que el directorio de workspace existe
    const fs = require('fs');
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    
    // Descargar VS Code, descomprimirlo y ejecutar las pruebas
    await runTests({
      // Versión de VS Code a usar para las pruebas
      version: 'stable',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace]
    });
    
    console.log('Integration tests completed successfully');
  } catch (err) {
    console.error('Error running tests:', err);
    process.exit(1);
  }
}

main();
