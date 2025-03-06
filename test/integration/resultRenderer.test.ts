import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { ResultRenderer, ExecutionResult } from '../../src/editor/resultRenderer';
import { CodeBlock } from '../../src/editor/documentParser';

suite('ResultRenderer Integration Tests', () => {
    let context: vscode.ExtensionContext;
    let renderer: ResultRenderer;
    let sandbox: sinon.SinonSandbox;
    
    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock para ExtensionContext
        context = {
            subscriptions: [],
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve()
            },
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve()
            },
            extensionUri: vscode.Uri.parse('file:///fake/path'),
            extensionPath: '/fake/path',
            asAbsolutePath: (relativePath) => `/fake/path/${relativePath}`,
            storagePath: '/fake/storage',
            globalStoragePath: '/fake/global-storage',
            logPath: '/fake/log',
            secrets: {
                get: () => Promise.resolve(''),
                store: () => Promise.resolve(),
                delete: () => Promise.resolve()
            }
        } as unknown as vscode.ExtensionContext;
        
        renderer = new ResultRenderer(context);
    });
    
    teardown(() => {
        sandbox.restore();
    });
    
    test('renderResult should call insertResultAsCodeBlock for markdown documents', async () => {
        // Crear un mock para TextEditor
        const editor = {
            document: {
                languageId: 'markdown',
                lineAt: (line: number) => ({
                    range: new vscode.Range(line, 0, line, 10)
                })
            },
            edit: (callback: Function) => {
                callback({
                    insert: () => {}
                });
                return Promise.resolve(true);
            }
        } as unknown as vscode.TextEditor;
        
        // Espiar el método insertResultAsCodeBlock
        const spy = sandbox.spy(renderer as any, 'insertResultAsCodeBlock');
        
        // Crear un bloque de código y un resultado para probar
        const codeBlock: CodeBlock = {
            code: 'echo "test";',
            range: new vscode.Range(0, 0, 2, 0),
            language: 'php'
        };
        
        const result: ExecutionResult = {
            output: 'test',
            isRaw: false
        };
        
        // Ejecutar el método a probar
        await renderer.renderResult(editor, codeBlock, result);
        
        // Verificar que se llamó al método correcto
        assert.strictEqual(spy.calledOnce, true);
    });
    
    test('renderResult should call renderResultAsDecoration for non-markdown documents', async () => {
        // Crear un mock para TextEditor
        const editor = {
            document: {
                languageId: 'php',
                lineAt: (line: number) => ({
                    range: new vscode.Range(line, 0, line, 10)
                })
            },
            setDecorations: () => {}
        } as unknown as vscode.TextEditor;
        
        // Espiar el método renderResultAsDecoration
        const spy = sandbox.spy(renderer as any, 'renderResultAsDecoration');
        
        // Crear un bloque de código y un resultado para probar
        const codeBlock: CodeBlock = {
            code: 'echo "test";',
            range: new vscode.Range(0, 0, 2, 0),
            language: 'php'
        };
        
        const result: ExecutionResult = {
            output: 'test',
            isRaw: false
        };
        
        // Ejecutar el método a probar
        await renderer.renderResult(editor, codeBlock, result);
        
        // Verificar que se llamó al método correcto
        assert.strictEqual(spy.calledOnce, true);
    });
    
    test('createHoverMessage should include buttons for collapsing, copying, and exporting', () => {
        // Crear un resultado para probar
        const result: ExecutionResult = {
            output: 'test',
            isRaw: false
        };
        
        // Llamar al método createHoverMessage (es privado, así que usamos any)
        const hoverMessage = (renderer as any).createHoverMessage(result, 'test-id');
        
        // Verificar que el mensaje incluye los botones esperados
        assert.ok(hoverMessage.value.includes('command:laravel-tinker-notebook.copyResult'));
        assert.ok(hoverMessage.value.includes('command:laravel-tinker-notebook.exportResult'));
        assert.ok(hoverMessage.value.includes('command:laravel-tinker-notebook.toggleResultCollapse'));
        assert.ok(hoverMessage.value.includes('command:laravel-tinker-notebook.expandAllResults'));
        assert.ok(hoverMessage.value.includes('command:laravel-tinker-notebook.collapseAllResults'));
    });
    
    test('parseErrorAndHighlight should extract line numbers from error messages', () => {
        // Crear un bloque de código para probar
        const codeBlock: CodeBlock = {
            code: 'echo "test";\nundefined_function();\necho "end";',
            range: new vscode.Range(5, 0, 8, 0),
            language: 'php'
        };
        
        // Crear mensajes de error con diferentes formatos
        const errorMessages = [
            'PHP Parse error: syntax error, unexpected \';\' in /tmp/tinker.php on line 2',
            'ErrorException(2): Undefined variable $test in /tmp/tinker.php:3',
            'Error in line 1: Undefined function'
        ];
        
        // Probar cada mensaje de error
        errorMessages.forEach((errorMessage, index) => {
            // Llamar al método parseErrorAndHighlight (es privado, así que usamos any)
            (renderer as any).parseErrorAndHighlight(errorMessage, codeBlock, `test-id-${index}`);
            
            // Verificar que se guardó una línea de error en el mapa
            assert.ok((renderer as any).errorLineMap.has(`test-id-${index}`));
        });
    });
});
