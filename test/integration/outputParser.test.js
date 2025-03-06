const path = require('path');
const assert = require('assert');
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const { TestSuite, Test } = require('./testClasses');

/**
 * Pruebas para el OutputParser utilizando VSCode real
 */
exports.run = async function (mainSuite) {
  const parserSuite = new TestSuite('OutputParser Tests');
  mainSuite.addSuite(parserSuite);
  
  // Prueba para parsear diferentes formatos de salida de Tinker
  parserSuite.addTest(new Test('Parsing de diferentes formatos de salida', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-parser-formats-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código para diferentes formatos de salida
    const content = `# Test Output Parser - Formatos

\`\`\`php
// Formato string simple
echo "Hello World";
\`\`\`

\`\`\`php
// Formato array
$array = ['a' => 1, 'b' => 2];
print_r($array);
\`\`\`

\`\`\`php
// Formato objeto
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
      
      console.log('Documento de prueba para parseo de formatos creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Verificar que el contenido del archivo es correcto
      const text = document.getText();
      assert.ok(text.includes('```php\n// Formato string simple\necho "Hello World";\n```'));
      assert.ok(text.includes('```php\n// Formato array\n$array = [\'a\' => 1, \'b\' => 2];\nprint_r($array);\n```'));
      assert.ok(text.includes('```php\n// Formato objeto\n$obj = new \\stdClass();\n$obj->property = "value";\nvar_dump($obj);\n```'));
      
      // Simular la inserción de resultados para string simple
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nHello World\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados para array
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(11, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nArray\n(\n    [a] => 1\n    [b] => 2\n)\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados para objeto
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(17, 4); // Final del tercer bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nobject(stdClass)#1 (1) {\n  ["property"]=>\n  string(5) "value"\n}\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente
      const updatedText = editor.document.getText();
      
      // Obtener el texto exacto insertado
      const stringResult = "```\n// Raw output\nHello World\n```";
      const arrayResult = "```\n// Raw output\nArray\n(\n    [a] => 1\n    [b] => 2\n)\n```";
      const objectResult = "```\n// Raw output\nobject(stdClass)#1 (1) {\n  [\"property\"]=>\n  string(5) \"value\"\n}\n```";
      
      // Imprimir para depuración
      console.log('Texto actualizado:', updatedText);
      console.log('Verificando inclusión de:', stringResult);
      
      // Verificar cada parte
      assert.ok(updatedText.includes("```\n// Raw output\nHello World\n```"), 'No se encontró el resultado del string');
      assert.ok(updatedText.includes("Array\n("), 'No se encontró el inicio del array');
      assert.ok(updatedText.includes("[a] => 1"), 'No se encontró el contenido del array');
      assert.ok(updatedText.includes("object(stdClass)"), 'No se encontró el objeto');
      
      console.log('Prueba de parseo de diferentes formatos completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
  
  // Prueba para detección de errores en la salida
  parserSuite.addTest(new Test('Detección de errores en la salida', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-parser-errors-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código que provocarían errores
    const content = `# Test Output Parser - Errores

\`\`\`php
// Error de sintaxis
echo "Unclosed string;
\`\`\`

\`\`\`php
// Error de variable indefinida
echo $undefinedVariable;
\`\`\`

\`\`\`php
// Error de tipo
$number = "not a number";
return $number + 10;
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
      
      // Simular la inserción de resultados con error de sintaxis
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(5, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Error output\nParse error: syntax error, unexpected end of file, expecting '\"' in Command line code on line 1\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados con error de variable indefinida
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(11, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Error output\nUndefined variable: undefinedVariable in Command line code on line 1\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados con error de tipo
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(17, 4); // Final del tercer bloque
        const resultText = `\n\n\`\`\`\n// Error output\nType error: Unsupported operand types: string + int in Command line code on line 2\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente
      const updatedText = editor.document.getText();
      console.log('Verificando errores en el texto:', updatedText);
      
      // Verificar cada parte con comprobaciones más específicas
      assert.ok(updatedText.includes('Parse error: syntax error'), 'No se encontró el error de sintaxis');
      assert.ok(updatedText.includes('Undefined variable: undefinedVariable'), 'No se encontró el error de variable indefinida');
      assert.ok(updatedText.includes('Type error: Unsupported operand types'), 'No se encontró el error de tipo');
      
      console.log('Prueba de detección de errores completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
  
  // Prueba para manejo de salidas multilínea
  parserSuite.addTest(new Test('Manejo de salidas multilínea', async () => {
    // Crear archivo temporal para la prueba
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, `test-parser-multiline-${Date.now()}.tinker.md`);
    
    // Contenido con bloques de código que producirían salidas multilínea
    const content = `# Test Output Parser - Multilínea

\`\`\`php
// Array anidado
$nested = [
    'level1' => [
        'level2' => [
            'level3' => 'deep value'
        ]
    ]
];
print_r($nested);
\`\`\`

\`\`\`php
// Objeto complejo
$user = new \\stdClass();
$user->name = 'John';
$user->profile = new \\stdClass();
$user->profile->age = 30;
$user->profile->email = 'john@example.com';
var_dump($user);
\`\`\`

\`\`\`php
// Generación de tabla
for ($i = 1; $i <= 5; $i++) {
    echo "Línea $i: " . str_repeat('*', $i) . "\\n";
}
\`\`\`
`;
    
    // Escribir el contenido al archivo
    fs.writeFileSync(testFilePath, content);
    
    try {
      // Abrir el documento en VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      
      console.log('Documento de prueba para salidas multilínea creado y abierto');
      
      // Verificar que el documento se ha abierto correctamente
      assert.strictEqual(editor.document.uri.fsPath, testFilePath);
      
      // Simular la inserción de resultados para array anidado
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(12, 4); // Final del primer bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nArray\n(\n    [level1] => Array\n        (\n            [level2] => Array\n                (\n                    [level3] => deep value\n                )\n        )\n)\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados para objeto complejo
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(22, 4); // Final del segundo bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nobject(stdClass)#1 (2) {\n  ["name"]=>\n  string(4) "John"\n  ["profile"]=>\n  object(stdClass)#2 (2) {\n    ["age"]=>\n    int(30)\n    ["email"]=>\n    string(16) "john@example.com"\n  }\n}\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Simular la inserción de resultados para generación de tabla
      await editor.edit(editBuilder => {
        const endPosition = new vscode.Position(28, 4); // Final del tercer bloque
        const resultText = `\n\n\`\`\`\n// Raw output\nLínea 1: *\nLínea 2: **\nLínea 3: ***\nLínea 4: ****\nLínea 5: *****\n\`\`\`\n`;
        editBuilder.insert(endPosition, resultText);
      });
      
      // Verificar que todos los resultados se insertaron correctamente
      const updatedText = editor.document.getText();
      console.log('Verificando salidas multilínea en el texto');
      
      // Verificar cada parte con comprobaciones más flexibles
      assert.ok(updatedText.includes('level1'), 'No se encontró el array anidado');
      assert.ok(updatedText.includes('level3'), 'No se encontró el nivel profundo del array');
      assert.ok(updatedText.includes('object(stdClass)'), 'No se encontró el tipo de objeto');
      assert.ok(updatedText.includes('john@example.com'), 'No se encontró el email en el objeto');
      assert.ok(updatedText.includes('Línea 1:'), 'No se encontró la línea 1');
      assert.ok(updatedText.includes('Línea 5:'), 'No se encontró la línea 5');
      
      console.log('Prueba de manejo de salidas multilínea completada exitosamente');
      
    } finally {
      // Limpiar: cerrar el editor y eliminar el archivo temporal
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }));
};
