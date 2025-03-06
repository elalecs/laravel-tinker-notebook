import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('Export Result End-to-End Tests', () => {
    let sandbox: sinon.SinonSandbox;
    
    setup(() => {
        sandbox = sinon.createSandbox();
    });
    
    teardown(() => {
        sandbox.restore();
    });
    
    test('Export result command should be registered', async () => {
        // Verificar que el comando está registrado
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('laravel-tinker-notebook.exportResult'));
    });
    
    test('Copy result command should be registered', async () => {
        // Verificar que el comando está registrado
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('laravel-tinker-notebook.copyResult'));
    });
    
    test('Toggle result collapse command should be registered', async () => {
        // Verificar que el comando está registrado
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('laravel-tinker-notebook.toggleResultCollapse'));
    });
    
    test('Expand all results command should be registered', async () => {
        // Verificar que el comando está registrado
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('laravel-tinker-notebook.expandAllResults'));
    });
    
    test('Collapse all results command should be registered', async () => {
        // Verificar que el comando está registrado
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('laravel-tinker-notebook.collapseAllResults'));
    });
    
    test('Export result should show quick pick with format options', async () => {
        // Mock para vscode.window.showQuickPick
        const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'JSON',
            description: 'Export as JSON file',
            format: 'json'
        });
        
        // Mock para vscode.window.showSaveDialog
        const showSaveDialogStub = sandbox.stub(vscode.window, 'showSaveDialog').resolves(undefined);
        
        // Ejecutar el comando
        await vscode.commands.executeCommand('laravel-tinker-notebook.exportResult');
        
        // Verificar que se mostró el quick pick con las opciones correctas
        assert.strictEqual(showQuickPickStub.calledOnce, true);
        
        // Verificar los argumentos pasados a showQuickPick
        const options = showQuickPickStub.args[0][0];
        assert.ok(options.some((option: any) => option.label === 'JSON'));
        assert.ok(options.some((option: any) => option.label === 'CSV'));
        assert.ok(options.some((option: any) => option.label === 'HTML'));
        assert.ok(options.some((option: any) => option.label === 'Plain Text'));
    });
    
    test('Export result should save file when format and path are selected', async () => {
        // Crear un archivo temporal para la prueba
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, 'test-export.json');
        
        // Mock para vscode.window.showQuickPick
        sandbox.stub(vscode.window, 'showQuickPick').resolves({
            label: 'JSON',
            description: 'Export as JSON file',
            format: 'json'
        });
        
        // Mock para vscode.window.showSaveDialog
        sandbox.stub(vscode.window, 'showSaveDialog').resolves(vscode.Uri.file(tempFilePath));
        
        // Mock para fs.writeFileSync
        const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
        
        // Mock para el último resultado
        sandbox.stub(global, 'lastExecutionResult').value({
            output: '{"name":"John","age":30}',
            isRaw: false
        });
        
        // Ejecutar el comando
        await vscode.commands.executeCommand('laravel-tinker-notebook.exportResult');
        
        // Verificar que se llamó a writeFileSync con los argumentos correctos
        assert.strictEqual(writeFileSyncStub.calledOnce, true);
        assert.strictEqual(writeFileSyncStub.args[0][0], tempFilePath);
        
        // El contenido debe ser un JSON formateado
        const content = writeFileSyncStub.args[0][1];
        assert.doesNotThrow(() => JSON.parse(content));
    });
});
