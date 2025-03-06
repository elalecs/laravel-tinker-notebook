#!/usr/bin/env node

/**
 * Script para automatizar la captura de screenshots, GIFs y videos para la documentación
 * de Laravel Tinker Notebook.
 * 
 * Este script:
 * 1. Inicia VS Code con la extensión en modo de desarrollo
 * 2. Captura screenshots de las características principales
 * 3. Genera GIFs para interacciones simples
 * 4. Graba videos cortos para demostraciones más complejas
 * 
 * Requisitos:
 * - macOS (usa herramientas nativas como screencapture)
 * - ffmpeg (para GIFs y videos): instalar con `brew install ffmpeg`
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn, exec } = require('child_process');
const { runTests } = require('@vscode/test-electron');

// Configuración
const config = {
  // Directorios
  extensionRoot: path.resolve(__dirname, '../'),
  outputDir: path.resolve(__dirname, '../docs/images'),
  testWorkspace: path.resolve(__dirname, '../test-workspace'),
  
  // Configuración de capturas
  screenshots: [
    { 
      name: 'main-interface', 
      description: 'Main interface with code blocks and results',
      delay: 3000 // ms
    },
    { 
      name: 'session-management', 
      description: 'Session management interface',
      delay: 3000
    },
    { 
      name: 'snippet-library', 
      description: 'Snippet library and organization',
      delay: 3000
    },
    { 
      name: 'output-formats', 
      description: 'Different output formats (JSON, table, raw)',
      delay: 3000
    },
    { 
      name: 'error-handling', 
      description: 'Error handling and visualization',
      delay: 3000
    },
    { 
      name: 'special-directives', 
      description: 'Special directives in action',
      delay: 3000
    },
    { 
      name: 'process-pooling', 
      description: 'Process pooling and performance metrics',
      delay: 3000
    }
  ],
  
  // Configuración de GIFs
  gifs: [
    {
      name: 'code-execution',
      description: 'Creating and executing code blocks',
      duration: 8, // segundos
      fps: 10
    },
    {
      name: 'session-management',
      description: 'Managing sessions between code blocks',
      duration: 10,
      fps: 10
    },
    {
      name: 'snippet-library-usage',
      description: 'Using the snippet library',
      duration: 12,
      fps: 10
    }
  ],
  
  // Configuración de videos
  videos: [
    {
      name: 'special-directives-demo',
      description: 'Working with special directives',
      duration: 15 // segundos
    },
    {
      name: 'error-handling-demo',
      description: 'Handling errors and viewing detailed information',
      duration: 20
    },
    {
      name: 'export-import-demo',
      description: 'Exporting and importing snippets',
      duration: 25
    }
  ]
};

/**
 * Función principal que ejecuta el proceso de captura de documentación
 */
async function main() {
  try {
    console.log('\n=============================================');
    console.log('Iniciando captura de documentación visual...');
    console.log('=============================================');
    
    // Crear directorios necesarios
    ensureDirectoriesExist();
    
    // Preparar el entorno de prueba
    prepareTestEnvironment();
    
    // Lanzar VS Code en modo de desarrollo
    const vscodeProcess = await launchVSCode();
    
    // Dar tiempo para que VS Code se inicie completamente
    console.log('Esperando a que VS Code se inicie completamente...');
    await sleep(5000);
    
    // Capturar screenshots
    await captureScreenshots();
    
    // Capturar GIFs
    await captureGifs();
    
    // Capturar videos
    await captureVideos();
    
    // Cerrar VS Code
    vscodeProcess.kill();
    
    console.log('\n✅ Captura de documentación completada con éxito');
    console.log('\n=============================================');
    console.log('Archivos generados en:', config.outputDir);
    console.log('=============================================\n');
  } catch (err) {
    console.error('\n❌ Error al capturar documentación:', err);
    process.exit(1);
  }
}

/**
 * Asegura que todos los directorios necesarios existan
 */
function ensureDirectoriesExist() {
  console.log('Creando directorios necesarios...');
  
  // Directorio de salida para imágenes
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  // Directorio de workspace para pruebas
  if (!fs.existsSync(config.testWorkspace)) {
    fs.mkdirSync(config.testWorkspace, { recursive: true });
  }
}

/**
 * Prepara el entorno de prueba con archivos de ejemplo
 */
function prepareTestEnvironment() {
  console.log('Preparando entorno de prueba...');
  
  // Crear un proyecto Laravel de prueba
  const laravelTestDir = path.join(config.testWorkspace, 'laravel-project');
  if (!fs.existsSync(laravelTestDir)) {
    fs.mkdirSync(laravelTestDir, { recursive: true });
    // Crear un archivo artisan falso para simular un proyecto Laravel
    fs.writeFileSync(
      path.join(laravelTestDir, 'artisan'), 
      '#!/usr/bin/env php\n<?php\n// Este es un archivo artisan falso para pruebas'
    );
  }
  
  // Crear archivos de ejemplo para Tinker Notebook
  createExampleFiles();
}

/**
 * Crea archivos de ejemplo para las capturas
 */
function createExampleFiles() {
  // Archivo de ejemplo principal
  const mainExamplePath = path.join(config.testWorkspace, 'main-example.tinker.md');
  fs.writeFileSync(mainExamplePath, `# Laravel Tinker Notebook Demo

## Consultas básicas

\`\`\`php
// Definir algunos datos de ejemplo
$users = [
    ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com'],
    ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com'],
    ['id' => 3, 'name' => 'Bob Johnson', 'email' => 'bob@example.com'],
];

// Mostrar los usuarios
$users;
\`\`\`

## Formato JSON

\`\`\`php
// Convertir a JSON
echo json_encode($users, JSON_PRETTY_PRINT);
\`\`\`

## Usando directivas especiales

\`\`\`php
// @tinker-new-session
// Esta es una nueva sesión
$name = "Laravel Tinker Notebook";
echo "¡Hola desde {$name}!";
\`\`\`

## Manejo de errores

\`\`\`php
// Intentar usar una variable indefinida
echo $undefinedVariable;
\`\`\`
`);

  // Archivo de ejemplo para sesiones
  const sessionsExamplePath = path.join(config.testWorkspace, 'sessions-example.tinker.md');
  fs.writeFileSync(sessionsExamplePath, `# Gestión de sesiones

## Sesión A

\`\`\`php
// @tinker-new-session
$sessionName = "Sesión A";
$counter = 1;
echo "Iniciando {$sessionName} con contador = {$counter}";
\`\`\`

## Sesión B

\`\`\`php
// @tinker-new-session
$sessionName = "Sesión B";
$counter = 100;
echo "Iniciando {$sessionName} con contador = {$counter}";
\`\`\`

## Continuar en Sesión A

\`\`\`php
// Continuar en la sesión anterior (Sesión B)
$counter++;
echo "Ahora en {$sessionName}, contador = {$counter}";
\`\`\`

## Volver a Sesión A

\`\`\`php
// @tinker-session=A
// Volver a la Sesión A
$counter++;
echo "De vuelta en {$sessionName}, contador = {$counter}";
\`\`\`
`);

  // Archivo de ejemplo para snippets
  const snippetsExamplePath = path.join(config.testWorkspace, 'snippets-example.tinker.md');
  fs.writeFileSync(snippetsExamplePath, `# Biblioteca de Snippets

## Snippet: Consulta de usuarios

\`\`\`php
// Consulta de usuarios
$users = [
    ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com'],
    ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com'],
];
return $users;
\`\`\`

## Snippet: Formato de fecha

\`\`\`php
// Formatear fecha actual
$now = new DateTime();
return $now->format('Y-m-d H:i:s');
\`\`\`

## Snippet: Generar UUID

\`\`\`php
// Generar UUID
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
return generateUUID();
\`\`\`
`);
}

/**
 * Lanza VS Code en modo de desarrollo con la extensión
 */
async function launchVSCode() {
  console.log('Lanzando VS Code en modo de desarrollo...');
  
  // Ruta a la extensión
  const extensionDevelopmentPath = config.extensionRoot;
  
  // Lanzar VS Code como un proceso separado
  const vscode = spawn('code', [
    '--extensionDevelopmentPath=' + extensionDevelopmentPath,
    config.testWorkspace
  ], {
    detached: true,
    stdio: 'ignore'
  });
  
  // No esperar a que termine
  vscode.unref();
  
  return vscode;
}

/**
 * Captura screenshots de las características principales
 */
async function captureScreenshots() {
  console.log('\nCapturando screenshots...');
  
  for (const screenshot of config.screenshots) {
    console.log(`- Capturando: ${screenshot.description}...`);
    
    // Preparar el escenario específico para esta captura
    await prepareScenario(screenshot.name);
    
    // Esperar el tiempo especificado
    await sleep(screenshot.delay);
    
    // Capturar la pantalla usando screencapture (herramienta nativa de macOS)
    const outputPath = path.join(config.outputDir, `${screenshot.name}.png`);
    execSync(`screencapture -x ${outputPath}`);
    
    console.log(`  ✅ Guardado en: ${outputPath}`);
  }
}

/**
 * Prepara el escenario específico para cada tipo de captura
 */
async function prepareScenario(scenarioName) {
  console.log(`  🔄 Preparando escenario: ${scenarioName}...`);
  
  // Definir comandos específicos para cada escenario
  const scenarios = {
    'main-interface': async () => {
      // Abrir el archivo principal y ejecutar el primer bloque de código
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'main-example.tinker.md')
      });
      await sleep(1000);
      // Posicionar el cursor en el primer bloque de código
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      // Ejecutar el bloque de código (Ctrl+Enter)
      await simulateKeystrokes(['Control', 'Enter'], true);
    },
    
    'session-management': async () => {
      // Abrir el archivo de sesiones
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'sessions-example.tinker.md')
      });
      await sleep(1000);
      // Ejecutar los primeros dos bloques de código para mostrar dos sesiones
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      await simulateKeystrokes(['Control', 'Enter'], true);
      await sleep(1500);
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      await simulateKeystrokes(['Control', 'Enter'], true);
    },
    
    'snippet-library': async () => {
      // Abrir el archivo de snippets
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'snippets-example.tinker.md')
      });
      await sleep(1000);
      // Abrir la paleta de comandos y buscar "Laravel Tinker: Open Snippet Library"
      await simulateKeystrokes(['F1']);
      await sleep(500);
      await simulateKeystrokes(['L', 'a', 'r', 'a', 'v', 'e', 'l', ' ', 'T', 'i', 'n', 'k', 'e', 'r', ' ', 'O', 'p', 'e', 'n', ' ', 'S', 'n', 'i', 'p', 'p', 'e', 't']);
      await sleep(1000);
      await simulateKeystrokes(['Enter']);
    },
    
    'output-formats': async () => {
      // Abrir el archivo principal y ejecutar el bloque de formato JSON
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'main-example.tinker.md')
      });
      await sleep(1000);
      // Ir al bloque de formato JSON
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      await simulateKeystrokes(['Control', 'Enter'], true);
    },
    
    'error-handling': async () => {
      // Abrir el archivo principal y ejecutar el bloque con error
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'main-example.tinker.md')
      });
      await sleep(1000);
      // Ir al bloque con error
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      await simulateKeystrokes(['Control', 'Enter'], true);
    },
    
    'special-directives': async () => {
      // Abrir el archivo principal y mostrar el bloque con directivas especiales
      await executeVSCodeCommand('workbench.action.files.openFile', { 
        fileName: path.join(config.testWorkspace, 'main-example.tinker.md')
      });
      await sleep(1000);
      // Ir al bloque con directivas especiales
      await simulateKeystrokes(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']);
      await sleep(500);
      await simulateKeystrokes(['Control', 'Enter'], true);
    },
    
    'process-pooling': async () => {
      // Abrir la paleta de comandos y buscar "Laravel Tinker: Show Process Pool"
      await simulateKeystrokes(['F1']);
      await sleep(500);
      await simulateKeystrokes(['L', 'a', 'r', 'a', 'v', 'e', 'l', ' ', 'T', 'i', 'n', 'k', 'e', 'r', ' ', 'S', 'h', 'o', 'w', ' ', 'P', 'r', 'o', 'c', 'e', 's', 's', ' ', 'P', 'o', 'o', 'l']);
      await sleep(1000);
      await simulateKeystrokes(['Enter']);
    }
  };
  
  // Ejecutar el escenario específico o un escenario por defecto
  if (scenarios[scenarioName]) {
    await scenarios[scenarioName]();
  } else {
    console.log(`  ⚠️ No hay escenario específico para ${scenarioName}, usando escenario por defecto`);
    // Escenario por defecto
    await executeVSCodeCommand('workbench.action.files.openFile', { 
      fileName: path.join(config.testWorkspace, 'main-example.tinker.md')
    });
  }
}

/**
 * Captura GIFs para interacciones simples
 */
async function captureGifs() {
  console.log('\nCapturando GIFs...');
  
  for (const gif of config.gifs) {
    console.log(`- Capturando GIF: ${gif.description}...`);
    console.log(`  ⏱️ Duración: ${gif.duration} segundos`);
    
    // Capturar una serie de imágenes
    const tempDir = path.join(config.outputDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Calcular número de frames
    const totalFrames = gif.duration * gif.fps;
    const delay = 1000 / gif.fps;
    
    console.log(`  📸 Capturando ${totalFrames} frames...`);
    
    for (let i = 0; i < totalFrames; i++) {
      const framePath = path.join(tempDir, `frame_${i.toString().padStart(4, '0')}.png`);
      execSync(`screencapture -x ${framePath}`);
      await sleep(delay);
    }
    
    // Convertir imágenes a GIF usando ffmpeg
    const outputPath = path.join(config.outputDir, `${gif.name}.gif`);
    execSync(`ffmpeg -y -framerate ${gif.fps} -i ${tempDir}/frame_%04d.png -vf "scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 ${outputPath}`);
    
    // Limpiar archivos temporales
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log(`  ✅ GIF guardado en: ${outputPath}`);
  }
}

/**
 * Captura videos para demostraciones más complejas
 */
async function captureVideos() {
  console.log('\nCapturando videos...');
  
  for (const video of config.videos) {
    console.log(`- Capturando video: ${video.description}...`);
    console.log(`  ⏱️ Duración: ${video.duration} segundos`);
    
    // Usar herramienta nativa de macOS para grabar la pantalla
    const outputPath = path.join(config.outputDir, `${video.name}.mp4`);
    
    console.log(`  🎬 Iniciando grabación... (durará ${video.duration} segundos)`);
    console.log(`  ⚠️ NO INTERACTÚE con la computadora durante la grabación ⚠️`);
    
    // Usar ffmpeg para grabar la pantalla
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'avfoundation',
      '-i', '1:0', // Capturar pantalla sin audio
      '-t', video.duration.toString(),
      '-r', '30',
      '-c:v', 'h264',
      '-crf', '23',
      '-preset', 'ultrafast',
      '-y', outputPath
    ]);
    
    // Esperar a que termine la grabación
    await new Promise((resolve) => {
      ffmpeg.on('close', resolve);
    });
    
    console.log(`  ✅ Video guardado en: ${outputPath}`);
  }
}

/**
 * Función de utilidad para esperar un tiempo determinado
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula pulsaciones de teclas utilizando AppleScript (nativo de macOS)
 * @param {Array<string>} keys - Lista de teclas a pulsar
 * @param {boolean} combination - Si es true, presiona todas las teclas a la vez (como Ctrl+C)
 */
async function simulateKeystrokes(keys, combination = false) {
  console.log(`  🔑 Simulando teclas: ${keys.join(', ')}${combination ? ' (combinación)' : ''}`);
  
  try {
    if (combination) {
      // Mapear teclas a formato AppleScript
      const modifiers = [];
      let keyToPress = '';
      
      for (const key of keys) {
        if (key === 'Control') modifiers.push('control');
        else if (key === 'Alt' || key === 'Option') modifiers.push('option');
        else if (key === 'Shift') modifiers.push('shift');
        else if (key === 'Command' || key === 'Meta') modifiers.push('command');
        else if (key === 'Enter') keyToPress = 'return';
        else if (key === 'F1') keyToPress = 'f1';
        else keyToPress = key.toLowerCase();
      }
      
      // Crear el script AppleScript para la combinación de teclas
      const modifiersString = modifiers.length > 0 ? `using {${modifiers.join(', ')}}` : '';
      const script = `
        tell application "Visual Studio Code"
          activate
          tell application "System Events"
            keystroke "${keyToPress}" ${modifiersString}
          end tell
        end tell
      `;
      
      // Ejecutar el script
      execSync(`osascript -e '${script}'`);
    } else {
      // Para secuencias de teclas, procesamos una por una
      for (const key of keys) {
        let appleScriptKey;
        let modifiers = '';
        
        // Mapear teclas especiales
        if (key === 'ArrowDown') appleScriptKey = 'down arrow';
        else if (key === 'ArrowUp') appleScriptKey = 'up arrow';
        else if (key === 'ArrowLeft') appleScriptKey = 'left arrow';
        else if (key === 'ArrowRight') appleScriptKey = 'right arrow';
        else if (key === 'Enter') appleScriptKey = 'return';
        else if (key === 'F1') appleScriptKey = 'f1';
        else if (key === ' ') appleScriptKey = 'space';
        else appleScriptKey = key.toLowerCase();
        
        // Crear y ejecutar el script AppleScript
        const script = `
          tell application "Visual Studio Code"
            activate
            tell application "System Events"
              key code ${getKeyCode(appleScriptKey)} ${modifiers}
            end tell
          end tell
        `;
        
        execSync(`osascript -e '${script}'`);
        await sleep(50); // Pequeña pausa entre pulsaciones
      }
    }
    
    // Pausa después de la secuencia de teclas
    await sleep(500);
  } catch (error) {
    console.error(`  ❌ Error al simular teclas: ${error.message}`);
  }
}

/**
 * Obtiene el código de tecla para AppleScript
 * @param {string} key - Tecla a convertir
 * @returns {number} - Código de tecla para AppleScript
 */
function getKeyCode(key) {
  const keyCodes = {
    'a': 0, 'b': 11, 'c': 8, 'd': 2, 'e': 14, 'f': 3, 'g': 5, 'h': 4, 'i': 34,
    'j': 38, 'k': 40, 'l': 37, 'm': 46, 'n': 45, 'o': 31, 'p': 35, 'q': 12,
    'r': 15, 's': 1, 't': 17, 'u': 32, 'v': 9, 'w': 13, 'x': 7, 'y': 16, 'z': 6,
    '0': 29, '1': 18, '2': 19, '3': 20, '4': 21, '5': 23, '6': 22, '7': 26,
    '8': 28, '9': 25, '-': 27, '=': 24, 'tab': 48, 'space': 49, 'return': 36,
    'delete': 51, 'escape': 53, 'left arrow': 123, 'right arrow': 124,
    'down arrow': 125, 'up arrow': 126, 'f1': 122, 'f2': 120, 'f3': 99, 'f4': 118,
    'f5': 96, 'f6': 97, 'f7': 98, 'f8': 100, 'f9': 101, 'f10': 109, 'f11': 103,
    'f12': 111
  };
  
  return keyCodes[key] !== undefined ? keyCodes[key] : 0;
}

/**
 * Ejecuta un comando de VS Code a través de AppleScript
 * @param {string} command - Comando de VS Code a ejecutar
 * @param {Object} args - Argumentos para el comando
 */
async function executeVSCodeCommand(command, args = {}) {
  console.log(`  💻 Ejecutando comando VS Code: ${command}`);
  
  // Si args contiene fileName, usamos un enfoque especial para abrir archivos
  if (args.fileName) {
    const filePath = args.fileName;
    console.log(`  📂 Abriendo archivo: ${filePath}`);
    
    const script = `
      tell application "Visual Studio Code"
        activate
        delay 0.5
        open "${filePath}"
        delay 1
      end tell
    `;
    
    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error al abrir archivo: ${error.message}`);
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }
  
  // Para otros comandos, usamos la paleta de comandos
  const script = `
    tell application "Visual Studio Code"
      activate
      delay 0.5
      tell application "System Events"
        keystroke "p" using {command down, shift down}
        delay 0.5
        keystroke ">${command}"
        delay 0.5
        keystroke return
      end tell
    end tell
  `;
  
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar comando VS Code: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Error en AppleScript: ${stderr}`);
        reject(new Error(stderr));
        return;
      }
      resolve(stdout);
    });
  });
}

// Ejecutar el script
main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
