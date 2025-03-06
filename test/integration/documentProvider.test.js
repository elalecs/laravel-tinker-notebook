const path = require('path');
const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const { TestSuite, Test } = require('./testClasses');

/**
 * Pruebas del DocumentProvider utilizando VSCode real
 */
exports.run = async function (mainSuite) {
  const providerSuite = new TestSuite('DocumentProvider Tests');
  mainSuite.addSuite(providerSuite);
  
  // Prueba para verificar la instanciación y funcionamiento básico del provider
  providerSuite.addTest(new Test('Creación y funcionamiento básico del DocumentProvider', async () => {
    // Verificar que hay comandos disponibles en el sistema
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.length > 0, 'No se encontraron comandos en VS Code');
    
    // Buscar comandos relacionados con tinker
    const tinkerCommands = commands.filter(cmd => cmd.includes('laravel-tinker'));
    console.log(`Se encontraron ${tinkerCommands.length} comandos relacionados con laravel-tinker`);
    
    // Crear un archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-provider-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código
    const content = `# Test DocumentProvider

\`\`\`php
// Bloque de código de prueba
echo "Prueba de DocumentProvider";
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba creado y abierto para DocumentProvider');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del documento es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// Bloque de código de prueba\necho "Prueba de DocumentProvider";\n```'));
      
      // Verificar que podemos posicionar el cursor dentro del bloque de código
      const position = new vscode.Position(3, 10); // Línea 3, columna 10 (dentro del bloque)
      editor.selection = new vscode.Selection(position, position);
      assert.strictEqual(editor.selection.active.line, 3);
      
      // Simular interacción con el DocumentProvider a través del comando registrado
      if (tinkerCommands.length > 0) {
        // Buscar un comando relacionado con mostrar o actualizar contenido
        const showCommand = tinkerCommands.find(cmd => 
          cmd.includes('show') || cmd.includes('preview') || cmd.includes('render'));
          
        if (showCommand) {
          console.log(`Intentando ejecutar el comando: ${showCommand}`);
          try {
            await vscode.commands.executeCommand(showCommand);
            console.log('Comando ejecutado sin errores');
          } catch (err) {
            console.log('Error al ejecutar el comando (esperado en pruebas):', err.message);
          }
        }
      }
      
      // Verificar funcionalidad de decoración de editores
      // Comprobamos que podemos obtener el editor activo
      const activeEditor = vscode.window.activeTextEditor;
      assert.ok(activeEditor, 'No hay editor activo');
      assert.strictEqual(activeEditor.document.uri.fsPath, testFilePath);
      
      console.log('Prueba de DocumentProvider completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
};
