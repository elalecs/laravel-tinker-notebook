import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TinkerDocumentProvider } from './editor/documentProvider';
import { TinkerExecutionService, TinkerSession } from './execution/tinkerService';
import { DocumentParser } from './editor/documentParser';
import { ResultRenderer, ExecutionResult } from './editor/resultRenderer';
import { EventEmitter } from 'events';
import { SnippetManager } from './snippets/snippetManager';
import { SnippetWebviewProvider } from './snippets/snippetWebview';
import { OutputFormatterFactory } from './editor/outputFormatters';

export function activate(context: vscode.ExtensionContext) {
    console.log('Laravel Tinker Notebook extension is now active');

    // Initialize core services
    const tinkerService = new TinkerExecutionService();
    const documentParser = new DocumentParser();
    const resultRenderer = new ResultRenderer(context);
    const snippetManager = new SnippetManager(context);
    
    // Decoración para mostrar el estado de las sesiones
    const sessionActiveDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor('editorInlayHint.background'),
        border: '1px solid #3a9c3a',
        borderRadius: '3px',
        before: {
            contentText: '$(play) ',
            color: '#3a9c3a'
        }
    });
    
    const sessionInactiveDecorationType = vscode.window.createTextEditorDecorationType({
        border: '1px dotted #666',
        borderRadius: '3px',
        before: {
            contentText: '$(debug-disconnect) ',
            color: '#666'
        }
    });
    
    // Handle session events
    tinkerService.on('session-created', (session: TinkerSession) => {
        vscode.window.showInformationMessage(`Session created: ${session.name}`);
        updateSessionDecorations();
    });
    
    tinkerService.on('session-updated', () => {
        updateSessionDecorations();
    });
    
    tinkerService.on('session-closed', (sessionId: string) => {
        vscode.window.showInformationMessage(`Session closed: ${sessionId}`);
        updateSessionDecorations();
    });
    
    tinkerService.on('session-switched', (session: TinkerSession) => {
        vscode.window.showInformationMessage(`Switched to session: ${session.name}`);
        updateSessionDecorations();
    });
    
    // Función para actualizar las decoraciones que muestran el estado de las sesiones
    function updateSessionDecorations() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const document = editor.document;
        if (document.languageId !== 'markdown' && 
            !document.fileName.endsWith('.tinker') && 
            !document.fileName.endsWith('.tinker.md') && 
            !document.fileName.endsWith('.laravel-snippet')) {
            return;
        }
        
        const codeBlocks = documentParser.findAllCodeBlocks(document);
        const activeDecorations: vscode.DecorationOptions[] = [];
        const inactiveDecorations: vscode.DecorationOptions[] = [];
        
        const sessions = tinkerService.getSessions();
        const currentSession = tinkerService.getCurrentSession();
        
        for (const block of codeBlocks) {
            if (block.sessionId) {
                // Check if the session exists and is active
                const session = sessions.find(s => s.id === block.sessionId);
                
                if (session && session.isActive) {
                    const decoration: vscode.DecorationOptions = {
                        range: new vscode.Range(block.range.start, block.range.start),
                        hoverMessage: new vscode.MarkdownString(
                            `**Active session**: ${session.id}\n` +
                            `**Variables**: ${session.variables.join(', ') || 'None'}`
                        )
                    };
                    activeDecorations.push(decoration);
                } else if (session) {
                    const decoration: vscode.DecorationOptions = {
                        range: new vscode.Range(block.range.start, block.range.start),
                        hoverMessage: new vscode.MarkdownString(
                            `**Inactive session**: ${session.id}`
                        )
                    };
                    inactiveDecorations.push(decoration);
                }
            }
        }
        
        editor.setDecorations(sessionActiveDecorationType, activeDecorations);
        editor.setDecorations(sessionInactiveDecorationType, inactiveDecorations);
    }
    
    // Register document provider for .tinker.md files
    const tinkerDocProvider = new TinkerDocumentProvider(documentParser, resultRenderer);
    
    // Register commands
    // Command to create a new Tinker file
    const createTinkerFileCommand = vscode.commands.registerCommand('laravel-tinker-notebook.createTinkerFile', async () => {
        try {
            // Get the current workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }
            
            // Ask for file name
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter a name for your new Tinker file',
                placeHolder: 'example.tinker'
            });
            
            if (!fileName) {
                return; // User canceled
            }
            
            // Ensure file has .tinker extension
            const tinkerFileName = fileName.endsWith('.tinker') ? fileName : `${fileName}.tinker`;
            
            // Create file path
            const filePath = path.join(workspaceFolders[0].uri.fsPath, tinkerFileName);
            
            // Check if file already exists
            if (fs.existsSync(filePath)) {
                const overwrite = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'File already exists. Overwrite?'
                });
                
                if (overwrite !== 'Yes') {
                    return;
                }
            }
            
            // Template content for the new file
            const templateContent = `<?php
// ${tinkerFileName} - Created with Laravel Tinker Notebook

// Write your PHP/Laravel code here
// For example:
$greeting = 'Hello, Laravel Tinker!';
echo $greeting;

// Access Laravel specific features
// For example, list all users:
// $users = \App\Models\User::all();
// dump($users);
`;
            
            // Write to file
            fs.writeFileSync(filePath, templateContent);
            
            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage(`Created new Tinker file: ${tinkerFileName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating Tinker file: ${error}`);
        }
    });
    
    // Command to create a new Laravel Snippet file
    const createSnippetFileCommand = vscode.commands.registerCommand('laravel-tinker-notebook.createSnippetFile', async () => {
        try {
            // Get the current workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder is open');
                return;
            }
            
            // Ask for file name
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter a name for your new Laravel Snippet file',
                placeHolder: 'example.laravel-snippet'
            });
            
            if (!fileName) {
                return; // User canceled
            }
            
            // Ensure file has .laravel-snippet extension
            const snippetFileName = fileName.endsWith('.laravel-snippet') ? fileName : `${fileName}.laravel-snippet`;
            
            // Create file path
            const filePath = path.join(workspaceFolders[0].uri.fsPath, snippetFileName);
            
            // Check if file already exists
            if (fs.existsSync(filePath)) {
                const overwrite = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'File already exists. Overwrite?'
                });
                
                if (overwrite !== 'Yes') {
                    return;
                }
            }
            
            // Template content for the new file
            const templateContent = `<?php
// ${snippetFileName} - Created with Laravel Tinker Notebook

// This snippet can be reused across your Laravel projects
// For example, checking authentication status:

if (auth()->check()) {
    $user = auth()->user();
    dump('Authenticated as: ' . $user->name);
    dump('Email: ' . $user->email);
} else {
    dump('Not authenticated');
}

// Add more reusable Laravel code below
`;
            
            // Write to file
            fs.writeFileSync(filePath, templateContent);
            
            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage(`Created new Laravel Snippet file: ${snippetFileName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating Laravel Snippet file: ${error}`);
        }
    });

    // Command to run a code block
    const runCommand = vscode.commands.registerCommand('laravel-tinker-notebook.runBlock', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No editor is active');
            return;
        }

        try {
            // Get the current document
            const document = editor.document;
            
            // Check if we're in a supported file type
            if (document.languageId !== 'markdown' && 
                !document.fileName.endsWith('.tinker') && 
                !document.fileName.endsWith('.tinker.md') && 
                !document.fileName.endsWith('.laravel-snippet')) {
                vscode.window.showInformationMessage('This file type is not supported for Tinker execution');
                return;
            }
            
            // Get current position
            const position = editor.selection.active;
            
            // Find the code block at the current position
            const codeBlock = documentParser.findCodeBlockAtPosition(document, position);
            if (!codeBlock) {
                vscode.window.showInformationMessage('No executable code block found at cursor position');
                return;
            }
            
            // Show execution indicator
            vscode.window.setStatusBarMessage('Running code in Tinker...', 2000);
            
            // Get execution options based on directives
            const executionOptions = documentParser.getExecutionOptions(codeBlock);
            
            // Execute the code using Tinker
            const result = await tinkerService.executeCode(codeBlock.code, executionOptions);
            
            // Guardar el último resultado para copiar/exportar
            lastExecutionResult = result;
            
            // Update session decorations
            updateSessionDecorations();
            
            // Display the results
            if (!codeBlock.directives.includes('@tinker-hide-result')) {
                await resultRenderer.renderResult(editor, codeBlock, result);
            }
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error executing code: ${error}`);
        }
    });
    
    // Command to create a new session
    const createSessionCommand = vscode.commands.registerCommand('laravel-tinker-notebook.createSession', async () => {
        try {
            // Find the root of the Laravel project
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No hay carpeta de trabajo abierta');
                return;
            }
            
            // Execute empty code with a new session to create it
            const result = await tinkerService.executeCode('// New session created', { 
                newSession: true, 
                showRaw: false, 
                hideResult: true 
            });
            
            if (result.sessionId) {
                vscode.window.showInformationMessage(`New session created with ID: ${result.sessionId}`);
                updateSessionDecorations();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error creating session: ${error}`);
        }
    });
    
    // Command to close a session
    const closeSessionCommand = vscode.commands.registerCommand('laravel-tinker-notebook.closeSession', async () => {
        const sessions = tinkerService.getSessions();
        
        if (sessions.length === 0) {
            vscode.window.showInformationMessage('No active sessions to close');
            return;
        }
        
        // Offer the user a list of sessions to close
        const sessionItems = sessions.map(session => ({
            label: session.name,
            description: `Creada: ${session.createdAt.toLocaleTimeString()}, ID: ${session.id}`,
            sessionId: session.id
        }));
        
        const selectedSession = await vscode.window.showQuickPick(sessionItems, {
            placeHolder: 'Select a session to close'
        });
        
        if (selectedSession) {
            const closed = tinkerService.closeSession(selectedSession.sessionId);
            if (closed) {
                vscode.window.showInformationMessage(`Session closed: ${selectedSession.label}`);
                updateSessionDecorations();
            } else {
                vscode.window.showErrorMessage('Could not close the session');
            }
        }
    });
    
    // Command to switch between sessions
    const switchSessionCommand = vscode.commands.registerCommand('laravel-tinker-notebook.switchSession', async () => {
        const sessions = tinkerService.getSessions();
        
        if (sessions.length === 0) {
            vscode.window.showInformationMessage('No hay sesiones disponibles');
            return;
        }
        
        // Offer the user a list of sessions to switch to
        const sessionItems = sessions.map(session => ({
            label: session.name,
            description: `Creada: ${session.createdAt.toLocaleTimeString()}, Variables: ${session.variables.length}`,
            detail: `ID: ${session.id}`,
            sessionId: session.id
        }));
        
        const selectedSession = await vscode.window.showQuickPick(sessionItems, {
            placeHolder: 'Select a session to switch to'
        });
        
        if (selectedSession) {
            const switched = tinkerService.switchToSession(selectedSession.sessionId);
            if (switched) {
                vscode.window.showInformationMessage(`Switched to session: ${selectedSession.label}`);
                updateSessionDecorations();
            } else {
                vscode.window.showErrorMessage('Could not switch to the selected session');
            }
        }
    });
    
    // Command to show the variables of the current session
    const showSessionVariablesCommand = vscode.commands.registerCommand('laravel-tinker-notebook.showSessionVariables', () => {
        const currentSession = tinkerService.getCurrentSession();
        
        if (!currentSession) {
            vscode.window.showInformationMessage('No active session');
            return;
        }
        
        const variablesCount = currentSession.variables.length;
        
        if (variablesCount === 0) {
            vscode.window.showInformationMessage(`The session ${currentSession.name} has no defined variables`);
            return;
        }
        
        const variablesList = currentSession.variables.join(', ');
        vscode.window.showInformationMessage(
            `Variables available in session ${currentSession.name}: ${variablesList}`
        );
    });
    
    // Register events to update decorations when the editor changes
    const editorChangeSubscription = vscode.window.onDidChangeActiveTextEditor(() => {
        updateSessionDecorations();
    });
    
    const documentChangeSubscription = vscode.workspace.onDidChangeTextDocument(() => {
        updateSessionDecorations();
    });
    
    // Register the "Run on Tinker" code lens provider
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        [{ language: 'markdown' }, { pattern: '**/*.tinker' }, { pattern: '**/*.tinker.md' }, { pattern: '**/*.laravel-snippet' }],
        {
            provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
                const codeBlocks = documentParser.findAllCodeBlocks(document);
                return codeBlocks.map(block => {
                    return new vscode.CodeLens(block.range, {
                        title: '▶ Run on Tinker',
                        command: 'laravel-tinker-notebook.runBlock',
                        arguments: []
                    });
                });
            }
        }
    );
    
    // Register the WebView provider for the snippet library
    const snippetViewProvider = new SnippetWebviewProvider(context, snippetManager);
    const snippetWebviewRegistration = vscode.window.registerWebviewViewProvider(
        SnippetWebviewProvider.viewType,
        snippetViewProvider
    );
    
    // Variable to store the last execution result
    let lastExecutionResult: ExecutionResult | undefined;
    
    // Crear una instancia del formateador para usar en los comandos de exportación
    const formatterFactory = new OutputFormatterFactory();
    
    // Comando para crear un nuevo snippet desde el código seleccionado
    const createSnippetFromSelectionCommand = vscode.commands.registerCommand(
        'laravel-tinker-notebook.createSnippetFromSelection',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No hay editor activo');
                return;
            }

            const selection = editor.selection;
            if (selection.isEmpty) {
                vscode.window.showInformationMessage('No hay texto seleccionado');
                return;
            }

            const code = editor.document.getText(selection);

            // Solicitar detalles del snippet al usuario
            const name = await vscode.window.showInputBox({
                prompt: 'Ingresa un nombre para el snippet',
                placeHolder: 'Mi Snippet'
            });

            if (!name) {
                return; // Usuario canceló
            }

            const description = await vscode.window.showInputBox({
                prompt: 'Ingresa una descripción para el snippet',
                placeHolder: 'Descripción'
            });

            if (description === undefined) {
                return; // Usuario canceló
            }

            const tagsInput = await vscode.window.showInputBox({
                prompt: 'Ingresa etiquetas (separadas por comas)',
                placeHolder: 'laravel, eloquent, authentication'
            });

            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

            const categories = ['General', 'Models', 'Controllers', 'Authentication', 'Database', 'API', 'Other'];
            const category = await vscode.window.showQuickPick(categories, {
                placeHolder: 'Selecciona una categoría'
            });

            if (!category) {
                return; // Usuario canceló
            }

            // Crear el snippet
            const newSnippet = snippetManager.saveSnippet({
                name,
                description,
                code,
                tags,
                category
            });

            vscode.window.showInformationMessage(`Snippet "${name}" creado`);            
        }
    );
    
    // Comando para exportar snippets
    const exportSnippetsCommand = vscode.commands.registerCommand(
        'laravel-tinker-notebook.exportSnippets',
        async () => {
            try {
                const filePath = await snippetManager.exportSnippets();
                vscode.window.showInformationMessage(`Snippets exportados a ${filePath}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error al exportar snippets: ${error}`);
            }
        }
    );
    
    // Comando para importar snippets
    const importSnippetsCommand = vscode.commands.registerCommand(
        'laravel-tinker-notebook.importSnippets',
        async () => {
            try {
                const count = await snippetManager.importSnippets();
                vscode.window.showInformationMessage(`Importados ${count} snippets`);
            } catch (error) {
                vscode.window.showErrorMessage(`Error al importar snippets: ${error}`);
            }
        }
    );
    
    // Comando para copiar el resultado al portapapeles
    const copyResultCommand = vscode.commands.registerCommand(
        'laravel-tinker-notebook.copyResult',
        async () => {
            if (!lastExecutionResult) {
                vscode.window.showInformationMessage('No hay resultados para copiar');
                return;
            }
            
            const output = lastExecutionResult.error || lastExecutionResult.output;
            await vscode.env.clipboard.writeText(output);
            vscode.window.showInformationMessage('Resultado copiado al portapapeles');
        }
    );
    
    // Comando para exportar el resultado
    const exportResultCommand = vscode.commands.registerCommand(
        'laravel-tinker-notebook.exportResult',
        async () => {
            if (!lastExecutionResult) {
                vscode.window.showInformationMessage('No hay resultados para exportar');
                return;
            }
            
            // Mostrar opciones de formato
            const formatOptions = ['JSON', 'CSV', 'HTML', 'Texto plano'];
            const selectedFormat = await vscode.window.showQuickPick(formatOptions, {
                placeHolder: 'Selecciona un formato para exportar'
            });
            
            if (!selectedFormat) {
                return; // Usuario canceló
            }
            
            // Obtener la ruta donde guardar el archivo
            const defaultPath = path.join(vscode.workspace.rootPath || '', 'tinker-result');
            const fileExtension = selectedFormat === 'JSON' ? '.json' : 
                                 selectedFormat === 'CSV' ? '.csv' : 
                                 selectedFormat === 'HTML' ? '.html' : '.txt';
                                 
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath + fileExtension),
                filters: {
                    'All Files': ['*']
                }
            });
            
            if (!uri) {
                return; // Usuario canceló
            }
            
            try {
                // Formatear el resultado según el formato seleccionado
                let content = '';
                const output = lastExecutionResult.error || lastExecutionResult.output;
                
                switch (selectedFormat) {
                    case 'JSON':
                        try {
                            // Intentar parsear como JSON
                            const data = JSON.parse(output);
                            content = JSON.stringify(data, null, 2);
                        } catch (e) {
                            // Si no es JSON válido, crear un objeto con el output
                            content = JSON.stringify({ result: output }, null, 2);
                        }
                        break;
                        
                    case 'CSV':
                        try {
                            // Intentar convertir a CSV si es un array de objetos
                            const data = JSON.parse(output);
                            if (Array.isArray(data) && data.length > 0) {
                                const headers = Object.keys(data[0]);
                                const headerRow = headers.join(',');
                                const rows = data.map(item => {
                                    return headers.map(header => {
                                        const value = item[header];
                                        // Escape double quotes and values containing commas
                                        return typeof value === 'string' ? 
                                            `"${value.replace(/"/g, '""')}"` : 
                                            String(value);
                                    }).join(',');
                                });
                                content = [headerRow, ...rows].join('\n');
                            } else {
                                content = 'result\n' + output;
                            }
                        } catch (e) {
                            content = 'result\n' + output;
                        }
                        break;
                        
                    case 'HTML':
                        try {
                            // Try to create an HTML table if it's an array of objects
                            const data = JSON.parse(output);
                            if (Array.isArray(data) && data.length > 0) {
                                const headers = Object.keys(data[0]);
                                const headerRow = headers.map(h => `<th>${h}</th>`).join('');
                                const rows = data.map(item => {
                                    const cells = headers.map(header => {
                                        return `<td>${item[header]}</td>`;
                                    }).join('');
                                    return `<tr>${cells}</tr>`;
                                }).join('');
                                
                                content = `<!DOCTYPE html>
<html>
<head>
  <title>Tinker Result</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Tinker Result</h1>
  <table>
    <thead>
      <tr>${headerRow}</tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
                            } else {
                                content = `<!DOCTYPE html>
<html>
<head>
  <title>Tinker Result</title>
</head>
<body>
  <h1>Tinker Result</h1>
  <pre>${output}</pre>
</body>
</html>`;
                            }
                        } catch (e) {
                            content = `<!DOCTYPE html>
<html>
<head>
  <title>Tinker Result</title>
</head>
<body>
  <h1>Tinker Result</h1>
  <pre>${output}</pre>
</body>
</html>`;
                        }
                        break;
                        
                    default: // Plain text
                        content = output;
                }
                
                // Save file
                fs.writeFileSync(uri.fsPath, content);
                vscode.window.showInformationMessage(`Resultado exportado a ${uri.fsPath}`);
                
            } catch (error) {
                vscode.window.showErrorMessage(`Error al exportar el resultado: ${error}`);
            }
        }
    );
    
    context.subscriptions.push(
        runCommand, 
        createTinkerFileCommand, 
        createSnippetFileCommand, 
        createSessionCommand,
        closeSessionCommand,
        switchSessionCommand,
        showSessionVariablesCommand,
        editorChangeSubscription,
        documentChangeSubscription,
        codeLensProvider,
        snippetWebviewRegistration,
        createSnippetFromSelectionCommand,
        exportSnippetsCommand,
        importSnippetsCommand,
        copyResultCommand,
        exportResultCommand
    );
}

export function deactivate() {
    // Clean up resources when extension is deactivated
}
