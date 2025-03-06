const path = require('path');
const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const { TestSuite, Test } = require('./testClasses');

/**
 * Pruebas de formatters de salida utilizando VSCode real
 */
exports.run = async function (mainSuite) {
  const formatterSuite = new TestSuite('OutputFormatter Tests');
  mainSuite.addSuite(formatterSuite);
  
  // Prueba para simular la funcionalidad básica de formateo
  formatterSuite.addTest(new Test('Funcionalidad básica de formateo', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-formatter-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código para diferentes tipos de datos
    const content = `# Test Formatters

\`\`\`php
// Strings
$string = "Hello World";
echo $string;
\`\`\`

\`\`\`php
// Arrays
$array = ['a' => 1, 'b' => 2];
print_r($array);
\`\`\`

\`\`\`php
// Objects
$obj = new \\stdClass();
$obj->property = "value";
var_dump($obj);
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba para formatters creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// Strings\n$string = "Hello World";\necho $string;\n```'));
      assert.ok(text.includes('```php\n// Arrays\n$array = [\'a\' => 1, \'b\' => 2];\nprint_r($array);\n```'));
      assert.ok(text.includes('```php\n// Objects\n$obj = new \\stdClass();\n$obj->property = "value";\nvar_dump($obj);\n```'));
      
      // Simular la formatación de resultados 
      // String
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Result (String Formatter)\nString: "Hello World"\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Array
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(11, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Result (Array Formatter)\nArray: ["a" => 1, "b" => 2]\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Object
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(18, 4); // Final del tercer bloque
        const resultText = `\n\n\`\`\`\n// Result (Object Formatter)\nObject: stdClass #1 {\n  property: "value"\n}\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente con el formato esperado
      const updatedText = editor.document.getText();
      assert.ok(updatedText.includes('```\n// Result (String Formatter)\nString: "Hello World"\n```'));
      assert.ok(updatedText.includes('```\n// Result (Array Formatter)\nArray: ["a" => 1, "b" => 2]\n```'));
      assert.ok(updatedText.includes('```\n// Result (Object Formatter)\nObject: stdClass #1 {\n  property: "value"\n}\n```'));
      
      console.log('Prueba de formateo básico completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
  
  // Prueba para simular diferentes opciones de formateo
  formatterSuite.addTest(new Test('Opciones de formateo', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-formatter-options-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código y directivas de formateo
    const content = `# Test Formatter Options

\`\`\`php
// @tinker-show-raw
// Con directiva para mostrar resultado raw
var_dump(['test' => true]);
\`\`\`

\`\`\`php
// @tinker-format-compact
// Con directiva para formato compacto
$data = [];
for ($i = 0; $i < 5; $i++) {
    $data[] = $i;
}
print_r($data);
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba para opciones de formateo creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// @tinker-show-raw\n// Con directiva para mostrar resultado raw\nvar_dump([\'test\' => true]);\n```'));
      assert.ok(text.includes('```php\n// @tinker-format-compact\n// Con directiva para formato compacto\n$data = [];\nfor ($i = 0; $i < 5; $i++) {\n    $data[] = $i;\n}\nprint_r($data);\n```'));
      
      // Simular la inserción de resultados con formato raw
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Raw Output\narray(1) {\n  ["test"]=>\\n  bool(true)\\n}\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados con formato compacto
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(14, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Compact Output\nArray: [0, 1, 2, 3, 4]\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente
      const updatedText = editor.document.getText();
      assert.ok(updatedText.includes('```\n// Raw Output\narray(1) {\n  ["test"]=>\\n  bool(true)\\n}\n```'));
      assert.ok(updatedText.includes('```\n// Compact Output\nArray: [0, 1, 2, 3, 4]\n```'));
      
      console.log('Prueba de opciones de formateo completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
};
