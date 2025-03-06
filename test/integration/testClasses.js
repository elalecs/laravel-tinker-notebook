/**
 * Módulo que contiene las clases auxiliares para las pruebas de integración
 */

// Clase para agrupar pruebas relacionadas
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.suites = [];
  }
  
  addTest(test) {
    this.tests.push(test);
  }
  
  addSuite(suite) {
    this.suites.push(suite);
  }
  
  async run() {
    console.log(`Ejecutando suite de pruebas: ${this.name}`);
    
    // Ejecutar primero las pruebas de esta suite
    for (const test of this.tests) {
      await test.run();
    }
    
    // Luego ejecutar las suites hijas
    for (const suite of this.suites) {
      await suite.run();
    }
  }
}

// Clase para definir pruebas individuales
class Test {
  constructor(name, fn) {
    this.name = name;
    this.fn = fn;
  }
  
  async run() {
    console.log(`Ejecutando prueba: ${this.name}`);
    try {
      await this.fn();
      console.log(`✅ Prueba pasada: ${this.name}`);
    } catch (err) {
      console.error(`❌ Prueba fallida: ${this.name}`);
      console.error(err);
      throw err;
    }
  }
}

// Exportar las clases
module.exports = {
  TestSuite,
  Test
};
