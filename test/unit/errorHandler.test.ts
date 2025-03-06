import * as assert from 'assert';
import * as vscode from 'vscode';
import { ResultRenderer } from '../../src/editor/resultRenderer';

// Mock para vscode.window.activeTextEditor
const mockEditor = {
    document: {
        lineAt: (line: number) => ({
            text: 'echo $undefinedVariable;',
            range: new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 25))
        })
    },
    setDecorations: () => {}
};

// Mock para vscode.window
const mockWindow = {
    activeTextEditor: mockEditor,
    showInformationMessage: () => {}
};

// Reemplazar vscode.window con nuestro mock
(global as any).vscode = {
    window: mockWindow,
    Range: vscode.Range,
    Position: vscode.Position,
    MarkdownString: class MockMarkdownString {
        value: string = '';
        isTrusted: boolean = false;
        
        appendMarkdown(text: string) {
            this.value += text;
            return this;
        }
    },
    DecorationRenderOptions: class {},
    TextEditorDecorationType: class {},
    ThemeColor: class {}
};

// Tests para parseErrorAndHighlight
suite('Error Analysis Tests', () => {
    let resultRenderer: ResultRenderer;
    
    setup(() => {
        resultRenderer = new ResultRenderer();
    });
    
    test('parseErrorAndHighlight should detect undefined variable errors', () => {
        const errorMessage = "PHP Notice:  Undefined variable: undefinedVariable in /path/to/file.php on line 1";
        const codeBlock = { 
            range: new vscode.Range(0, 0, 0, 25), 
            code: 'echo $undefinedVariable;',
            language: 'php'
        };
        
        const errorInfo = (resultRenderer as any).parseErrorAndHighlight(errorMessage, codeBlock, 'test-result-id');
        
        assert.strictEqual(errorInfo.errorType, 'Variable no definida');
        assert.ok(errorInfo.errorDescription.includes('undefinedVariable'));
        assert.strictEqual(errorInfo.errorLine, 0);
    });
    
    test('parseErrorAndHighlight should detect syntax errors', () => {
        const errorMessage = "PHP Parse error:  syntax error, unexpected ';' in /path/to/file.php on line 1";
        const codeBlock = { 
            range: new vscode.Range(0, 0, 0, 25), 
            code: 'echo "Hello world"";',
            language: 'php'
        };
        
        const errorInfo = (resultRenderer as any).parseErrorAndHighlight(errorMessage, codeBlock, 'test-result-id');
        
        assert.strictEqual(errorInfo.errorType, 'Error de sintaxis');
        assert.ok(errorInfo.errorDescription.includes('syntax error'));
    });
    
    test('parseErrorAndHighlight should detect class not found errors', () => {
        const errorMessage = "Class 'App\\Models\\NonExistentClass' not found";
        const codeBlock = { 
            range: new vscode.Range(0, 0, 0, 25), 
            code: 'new App\\Models\\NonExistentClass();',
            language: 'php'
        };
        
        const errorInfo = (resultRenderer as any).parseErrorAndHighlight(errorMessage, codeBlock, 'test-result-id');
        
        assert.strictEqual(errorInfo.errorType, 'Clase no encontrada');
        assert.ok(errorInfo.errorDescription.includes('NonExistentClass'));
    });
    
    test('parseErrorAndHighlight should detect method not found errors', () => {
        const errorMessage = "Call to undefined method App\\Models\\User::nonExistentMethod()";
        const codeBlock = { 
            range: new vscode.Range(0, 0, 0, 25), 
            code: '$user->nonExistentMethod();',
            language: 'php'
        };
        
        const errorInfo = (resultRenderer as any).parseErrorAndHighlight(errorMessage, codeBlock, 'test-result-id');
        
        assert.strictEqual(errorInfo.errorType, 'Método no definido');
        assert.ok(errorInfo.errorDescription.includes('nonExistentMethod'));
    });
    
    test('parseErrorAndHighlight should detect property not found errors', () => {
        const errorMessage = "Undefined property: App\\Models\\User::$nonExistentProperty";
        const codeBlock = { 
            range: new vscode.Range(0, 0, 0, 25), 
            code: 'echo $user->nonExistentProperty;',
            language: 'php'
        };
        
        const errorInfo = (resultRenderer as any).parseErrorAndHighlight(errorMessage, codeBlock, 'test-result-id');
        
        assert.strictEqual(errorInfo.errorType, 'Propiedad no definida');
        assert.ok(errorInfo.errorDescription.includes('nonExistentProperty'));
    });
});

// Tests para getErrorSuggestions
suite('Error Suggestions Tests', () => {
    let resultRenderer: ResultRenderer;
    
    setup(() => {
        resultRenderer = new ResultRenderer();
    });
    
    test('getErrorSuggestions should provide suggestions for undefined variable errors', () => {
        const suggestions = (resultRenderer as any).getErrorSuggestions('Variable no definida', 'Undefined variable: testVar');
        
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.includes('testVar')));
    });
    
    test('getErrorSuggestions should provide suggestions for syntax errors', () => {
        const suggestions = (resultRenderer as any).getErrorSuggestions('Error de sintaxis', 'syntax error, unexpected token');
        
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.includes('sintaxis')));
    });
    
    test('getErrorSuggestions should provide suggestions for class not found errors', () => {
        const suggestions = (resultRenderer as any).getErrorSuggestions('Clase no encontrada', 'Class "TestClass" not found');
        
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.includes('TestClass')));
    });
    
    test('getErrorSuggestions should provide suggestions for method not found errors', () => {
        const suggestions = (resultRenderer as any).getErrorSuggestions('Método no definido', 'App\\Models\\User::testMethod');
        
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.includes('testMethod')));
    });
    
    test('getErrorSuggestions should provide suggestions for property not found errors', () => {
        const suggestions = (resultRenderer as any).getErrorSuggestions('Propiedad no definida', 'App\\Models\\User::$testProperty');
        
        assert.ok(Array.isArray(suggestions));
        assert.ok(suggestions.length > 0);
        assert.ok(suggestions.some(s => s.includes('testProperty')));
    });
});

// Tests para generateErrorFix
suite('Error Fix Generation Tests', () => {
    let resultRenderer: ResultRenderer;
    
    setup(() => {
        resultRenderer = new ResultRenderer();
    });
    
    test('generateErrorFix should create fix for undefined variable', () => {
        const fix = (resultRenderer as any).generateErrorFix('Variable no definida', 'Undefined variable: testVar');
        
        assert.ok(fix);
        assert.ok(fix.includes('$testVar'));
        assert.ok(fix.includes('='));
    });
    
    test('generateErrorFix should create fix for class not found', () => {
        const fix = (resultRenderer as any).generateErrorFix('Clase no encontrada', 'Class "App\\Models\\TestClass" not found');
        
        assert.ok(fix);
        assert.ok(fix.includes('use App\\Models\\TestClass'));
    });
    
    test('generateErrorFix should create fix for undefined index', () => {
        const fix = (resultRenderer as any).generateErrorFix('Índice no definido', 'Undefined index: testIndex');
        
        assert.ok(fix);
        assert.ok(fix.includes('isset'));
        assert.ok(fix.includes('testIndex'));
    });
    
    test('generateErrorFix should create fix for array access error', () => {
        const fix = (resultRenderer as any).generateErrorFix('Error de acceso a array', 'Cannot use object as array');
        
        assert.ok(fix);
        assert.ok(fix.includes('is_array'));
    });
    
    test('generateErrorFix should create fix for undefined function', () => {
        const fix = (resultRenderer as any).generateErrorFix('Función no definida', 'Call to undefined function testFunction()');
        
        assert.ok(fix);
        assert.ok(fix.includes('function testFunction'));
    });
    
    test('generateErrorFix should create fix for undefined method', () => {
        const fix = (resultRenderer as any).generateErrorFix('Método no definido', 'Call to undefined method App\\Models\\User::testMethod()');
        
        assert.ok(fix);
        assert.ok(fix.includes('function testMethod'));
    });
    
    test('generateErrorFix should return null for unsupported error types', () => {
        const fix = (resultRenderer as any).generateErrorFix('Tipo de error no soportado', 'Error message');
        
        assert.strictEqual(fix, null);
    });
});

// Tests para createHoverMessage
suite('Error Hover Message Tests', () => {
    let resultRenderer: ResultRenderer;
    
    setup(() => {
        resultRenderer = new ResultRenderer();
    });
    
    test('createHoverMessage should include error type and description for errors', () => {
        const result = {
            output: 'Test output',
            error: 'PHP Notice: Undefined variable: testVar',
            sessionId: 'test-session',
            sessionActive: true,
            executionTime: 100,
            isRaw: false
        };
        
        // Mock para parseErrorAndHighlight
        (resultRenderer as any).parseErrorAndHighlight = () => ({
            errorType: 'Variable no definida',
            errorDescription: 'La variable $testVar no está definida',
            errorLine: 0
        });
        
        // Mock para getErrorSuggestions
        (resultRenderer as any).getErrorSuggestions = () => ['Define la variable antes de usarla'];
        
        // Mock para generateErrorFix
        (resultRenderer as any).generateErrorFix = () => '$testVar = null;';
        
        const hoverMessage = (resultRenderer as any).createHoverMessage(result, 'test-result-id');
        
        assert.ok(hoverMessage.value.includes('Error'));
        assert.ok(hoverMessage.value.includes('Variable no definida'));
        assert.ok(hoverMessage.value.includes('testVar'));
        assert.ok(hoverMessage.value.includes('Sugerencias'));
        assert.ok(hoverMessage.value.includes('Recursos adicionales'));
    });
    
    test('createHoverMessage should include session information', () => {
        const result = {
            output: 'Test output',
            sessionId: 'test-session',
            sessionActive: true,
            executionTime: 100,
            isRaw: false
        };
        
        const hoverMessage = (resultRenderer as any).createHoverMessage(result, 'test-result-id');
        
        assert.ok(hoverMessage.value.includes('Sesión'));
        assert.ok(hoverMessage.value.includes('test-session'));
        assert.ok(hoverMessage.value.includes('Activa'));
    });
});
