/**
 * Sistema de captura de evidencia visual para pruebas de integración
 * Optimizado para macOS usando AppleScript para automatización
 * 
 * Este sistema permite capturar imágenes durante la ejecución de pruebas de integración
 * para documentar visualmente el comportamiento de la extensión.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

class TestEvidence {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.outputDir = options.outputDir || path.join(__dirname, '../../test-evidence');
    this.currentTest = null;
    this.stepCounter = 0;
    this.metadata = [];
    this.startTime = null;
    
    // Verificar si estamos en macOS
    this.isMacOS = os.platform() === 'darwin';
    if (this.enabled && !this.isMacOS) {
      console.warn('⚠️ La captura de evidencia solo está soportada en macOS. Se desactivará.');
      this.enabled = false;
    }
    
    // Crear directorio de salida si no existe
    if (this.enabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log(`Sistema de evidencia ${this.enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    if (this.enabled) {
      console.log(`Directorio de salida: ${this.outputDir}`);
    }
  }
  
  /**
   * Inicia una nueva prueba
   * @param {string} testName - Nombre de la prueba
   */
  startTest(testName) {
    if (!this.enabled) return;
    
    this.currentTest = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    this.stepCounter = 0;
    this.metadata = [];
    this.startTime = new Date();
    
    // Crear directorio para esta prueba
    const testDir = path.join(this.outputDir, this.currentTest);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    } else {
      // Limpiar capturas anteriores
      const existingFiles = fs.readdirSync(testDir).filter(file => file.endsWith('.png'));
      existingFiles.forEach(file => {
        fs.unlinkSync(path.join(testDir, file));
      });
    }
    
    // Guardar información del sistema
    this.addMetadata('system_info', {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      timestamp: this.startTime.toISOString()
    });
    
    console.log(`📸 Iniciando captura de evidencia para prueba: ${testName}`);
  }
  
  /**
   * Captura una imagen de la pantalla actual
   * @param {string} description - Descripción de lo que muestra la captura
   */
  captureScreen(description = '') {
    if (!this.enabled || !this.currentTest) return;
    
    this.stepCounter++;
    const stepId = String(this.stepCounter).padStart(2, '0');
    const safeDescription = description.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${this.currentTest}-step-${stepId}${safeDescription ? '-' + safeDescription : ''}.png`;
    const filePath = path.join(this.outputDir, this.currentTest, fileName);
    
    try {
      // Usar screencapture de macOS para capturar la pantalla completa
      execSync(`screencapture -x "${filePath}"`);
      console.log(`📸 Captura guardada: ${fileName}`);
      
      // Guardar metadatos de la captura
      this.addMetadata(`capture_${this.stepCounter}`, {
        type: 'screen',
        description,
        file: fileName
      });
    } catch (error) {
      console.error(`❌ Error al capturar pantalla: ${error.message}`);
    }
    
    return filePath;
  }
  
  /**
   * Captura una ventana específica (VS Code)
   * @param {string} description - Descripción de lo que muestra la captura
   */
  captureVSCode(description = '') {
    if (!this.enabled || !this.currentTest) return;
    
    this.stepCounter++;
    const stepId = String(this.stepCounter).padStart(2, '0');
    const safeDescription = description.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${this.currentTest}-step-${stepId}${safeDescription ? '-' + safeDescription : ''}.png`;
    const filePath = path.join(this.outputDir, this.currentTest, fileName);
    
    try {
      // Usar AppleScript para activar VS Code y luego capturar su ventana
      const script = `
        tell application "Visual Studio Code"
          activate
          delay 0.5
        end tell
      `;
      
      execSync(`osascript -e '${script}'`);
      
      // Capturar la ventana activa (que debería ser VS Code)
      execSync(`screencapture -l$(osascript -e 'tell app "Visual Studio Code" to id of window 1') "${filePath}"`);
      console.log(`📸 Captura de VS Code guardada: ${fileName}`);
      
      // Guardar metadatos de la captura
      this.addMetadata(`capture_${this.stepCounter}`, {
        type: 'vscode',
        description,
        file: fileName
      });
    } catch (error) {
      console.error(`❌ Error al capturar VS Code: ${error.message}`);
      // Fallback a captura de pantalla completa
      this.captureScreen(description);
    }
    
    return filePath;
  }
  
  /**
   * Finaliza la prueba actual
   */
  endTest() {
    if (!this.enabled || !this.currentTest) return;
    
    // Guardar metadatos de la prueba
    const endTime = new Date();
    const duration = endTime - this.startTime;
    
    this.addMetadata('test_summary', {
      test: this.currentTest,
      steps: this.stepCounter,
      start_time: this.startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_ms: duration
    });
    
    // Guardar archivo de metadatos
    this.saveMetadata();
    
    console.log(`📷 Finalizada captura de evidencia para prueba: ${this.currentTest} (${this.stepCounter} capturas, ${duration}ms)`);
    this.currentTest = null;
    this.stepCounter = 0;
  }
  
  /**
   * Añade metadatos a la prueba actual
   * @param {string} key - Clave de los metadatos
   * @param {any} data - Datos a guardar
   */
  addMetadata(key, data) {
    if (!this.enabled || !this.currentTest) return;
    
    this.metadata.push({
      key,
      timestamp: new Date().toISOString(),
      data
    });
  }
  
  /**
   * Guarda los metadatos de la prueba en un archivo JSON
   */
  saveMetadata() {
    if (!this.enabled || !this.currentTest || this.metadata.length === 0) return;
    
    const metadataPath = path.join(this.outputDir, this.currentTest, 'metadata.json');
    
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(this.metadata, null, 2));
      console.log(`💾 Metadatos guardados: ${metadataPath}`);
    } catch (error) {
      console.error(`❌ Error al guardar metadatos: ${error.message}`);
    }
  }
  
  /**
   * Captura una región específica de la pantalla
   * @param {string} description - Descripción de lo que muestra la captura
   * @param {Object} region - Región a capturar {x, y, width, height}
   */
  captureRegion(description = '', region = {}) {
    if (!this.enabled || !this.currentTest) return;
    
    this.stepCounter++;
    const stepId = String(this.stepCounter).padStart(2, '0');
    const safeDescription = description.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${this.currentTest}-step-${stepId}${safeDescription ? '-' + safeDescription : ''}.png`;
    const filePath = path.join(this.outputDir, this.currentTest, fileName);
    
    try {
      // Validar región
      const { x, y, width, height } = region;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
        throw new Error('La región debe especificar x, y, width y height como números');
      }
      
      // Usar screencapture de macOS para capturar la región especificada
      execSync(`screencapture -R${x},${y},${width},${height} "${filePath}"`);
      console.log(`📷 Captura de región guardada: ${fileName}`);
      
      // Guardar metadatos de la captura
      this.addMetadata(`capture_${this.stepCounter}`, {
        type: 'region',
        description,
        file: fileName,
        region: { x, y, width, height }
      });
    } catch (error) {
      console.error(`❌ Error al capturar región: ${error.message}`);
    }
    
    return filePath;
  }
}

// Exportar la clase
module.exports = TestEvidence;
