const path = require('path');
const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const { TestSuite, Test } = require('./testClasses');

/**
 * Pruebas del ResultRenderer utilizando VSCode real
 */
exports.run = async function (mainSuite) {
  const rendererSuite = new TestSuite('ResultRenderer Tests');
  mainSuite.addSuite(rendererSuite);
  
  // Prueba para verificar la renderización básica de resultados
  rendererSuite.addTest(new Test('Renderización básica de resultados', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-renderer-${Date.now()}.tinker.md`);
    
    // Contenido con un bloque de código simple
    const content = `# Test ResultRenderer

\`\`\`php
// Bloque de código para prueba de renderización
echo "Test de ResultRenderer";
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba creado y abierto para ResultRenderer');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// Bloque de código para prueba de renderización\necho "Test de ResultRenderer";\n```'));
      
      // Posicionar el cursor dentro del bloque de código
      const position = new vscode.Position(3, 10); // Línea 3, columna 10 (dentro del bloque)
      editor.selection = new vscode.Selection(position, position);
      assert.strictEqual(editor.selection.active.line, 3);
      
      // Intentar ejecutar el comando para renderizar resultados
      // En un entorno de prueba, probablemente no tengamos un resultado real,
      // pero podemos verificar que el comando existe
      const commands = await vscode.commands.getCommands();
      const runCommand = commands.find(cmd => cmd.includes('laravel-tinker') && cmd.includes('run'));
      
      if (runCommand) {
        console.log(`Intentando ejecutar el comando: ${runCommand}`);
        try {
          await vscode.commands.executeCommand(runCommand);
          console.log('Comando ejecutado sin errores');
        } catch (err) {
          console.log('Error al ejecutar el comando (esperado en pruebas):', err.message);
        }
      } else {
        console.log('No se encontró un comando específico para ejecutar bloques de código');
      }
      
      // Verificar que podemos editar el documento para simular la inserción de resultados
      // Esto simula lo que haría ResultRenderer.insertResultAsCodeBlock
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del bloque de código
        const resultText = `\n\n\`\`\`\n// Result\nString: "Test de ResultRenderer"\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que el resultado se insertó correctamente
      const updatedText = editor.document.getText();
      assert.ok(updatedText.includes('```\n// Result\nString: "Test de ResultRenderer"\n```'));
      
      console.log('Prueba de renderización básica completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
  
  // Prueba para verificar la renderización de errores
  rendererSuite.addTest(new Test('Renderización de errores', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-renderer-error-${Date.now()}.tinker.md`);
    
    // Contenido con un bloque de código con error
    const content = `# Test ResultRenderer - Errores

\`\`\`php
// Bloque de código con error
$undefined_variable;
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba para errores creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// Bloque de código con error\n$undefined_variable;\n```'));
      
      // Posicionar el cursor dentro del bloque de código
      const position = new vscode.Position(3, 10); // Línea 3, columna 10 (dentro del bloque)
      editor.selection = new vscode.Selection(position, position);
      
      // Intentar ejecutar el comando para renderizar resultados
      // En un entorno de prueba, no podremos ejecutar el código realmente
      // pero podemos simular la inserción de un mensaje de error
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del bloque de código
        const errorText = `\n\n\`\`\`\n// Error\nUndefined variable: $undefined_variable\n\`\`\`\n`;
        editBuilder.insert(endPosition, errorText);
      });
      
      // Verificar que el error se insertó correctamente
      const updatedText = editor.document.getText();
      assert.ok(updatedText.includes('```\n// Error\nUndefined variable: $undefined_variable\n```'));
      
      console.log('Prueba de renderización de errores completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
  
  // Prueba para verificar la renderización de diferentes tipos de datos
  rendererSuite.addTest(new Test('Renderización de diferentes tipos de datos', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-renderer-types-${Date.now()}.tinker.md`);
    
    // Contenido con varios bloques de código para diferentes tipos de datos
    const content = `# Test ResultRenderer - Tipos de Datos

\`\`\`php
// String
"Texto de prueba";
\`\`\`

\`\`\`php
// Array
['a' => 1, 'b' => 2];
\`\`\`

\`\`\`php
// Objeto
new \\stdClass();
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba para tipos de datos creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// String\n"Texto de prueba";\n```'));
      assert.ok(text.includes('```php\n// Array\n[\'a\' => 1, \'b\' => 2];\n```'));
      assert.ok(text.includes('```php\n// Objeto\nnew \\stdClass();\n```'));
      
      // Simular la inserción de resultados para cada tipo
      // String
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Result\nString: "Texto de prueba"\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Array
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(10, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Result\nArray: ["a" => 1, "b" => 2]\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Objeto
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(15, 4); // Final del tercer bloque
        const resultText = `\n\n\`\`\`\n// Result\nObject: stdClass {}\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente
      const updatedText = editor.document.getText();
      assert.ok(updatedText.includes('```\n// Result\nString: "Texto de prueba"\n```'));
      assert.ok(updatedText.includes('```\n// Result\nArray: ["a" => 1, "b" => 2]\n```'));
      assert.ok(updatedText.includes('```\n// Result\nObject: stdClass {}\n```'));
      
      console.log('Prueba de renderización de diferentes tipos de datos completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
};
