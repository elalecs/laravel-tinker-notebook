import * as vscode from 'vscode';
import { CodeBlock } from './documentParser';
import { OutputFormatterFactory } from './outputFormatters';
import * as crypto from 'crypto';

export interface ExecutionResult {
    output: string;
    error?: string;
    isRaw: boolean;
    sessionId?: string; // ID of the session that executed the code
    sessionActive?: boolean; // Indicates if the session is active
    variables?: string[]; // Variables available in the session
}

export class ResultRenderer {
    private resultDecorationType: vscode.TextEditorDecorationType;
    private errorDecorationType: vscode.TextEditorDecorationType;
    private codeBlockActionDecorationType: vscode.TextEditorDecorationType;
    private codeBlockErrorDecorationType: vscode.TextEditorDecorationType;
    private codeBlockSuccessDecorationType: vscode.TextEditorDecorationType;
    private formatterFactory: OutputFormatterFactory;
    private context: vscode.ExtensionContext;
    private collapsedResults: Map<string, boolean> = new Map();
    private errorLineMap: Map<string, number> = new Map(); // Mapping of result ID to error line
    private blockStatusMap: Map<string, 'ready' | 'success' | 'error'> = new Map(); // Status of each code block
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        
        // Create decoration type for results
        this.resultDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 1em',
                backgroundColor: new vscode.ThemeColor('editor.infoBackground')
            }
        });
        
        // Create decoration type for error lines
        this.errorDecorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editorError.background'),
            borderColor: new vscode.ThemeColor('editorError.border'),
            borderStyle: 'solid',
            borderWidth: '0 0 0 2px',
            overviewRulerColor: new vscode.ThemeColor('editorError.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });
        
        // Create decoration type for code block actions
        this.codeBlockActionDecorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: 'Run Code',
                backgroundColor: new vscode.ThemeColor('button.background'),
                color: new vscode.ThemeColor('button.foreground'),
                margin: '0 0 0 10px',
                width: 'max-content',
                height: '22px',
                borderRadius: '3px',
                padding: '2px 8px'
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
        
        // Create decoration type for code block errors
        this.codeBlockErrorDecorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '$(error) Error',
                backgroundColor: new vscode.ThemeColor('errorForeground'),
                color: new vscode.ThemeColor('editor.background'),
                margin: '0 0 0 10px',
                width: 'max-content',
                height: '22px',
                borderRadius: '3px',
                padding: '2px 8px'
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
        
        // Create decoration type for code block success
        this.codeBlockSuccessDecorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '$(check) Executed',
                backgroundColor: new vscode.ThemeColor('terminal.ansiGreen'),
                color: new vscode.ThemeColor('editor.background'),
                margin: '0 0 0 10px',
                width: 'max-content',
                height: '22px',
                borderRadius: '3px',
                padding: '2px 8px'
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
        
        // Initialize formatter factory
        this.formatterFactory = new OutputFormatterFactory();
        
        // Register command to toggle result visibility
        context.subscriptions.push(
            vscode.commands.registerCommand('laravel-tinker-notebook.toggleResultCollapse', 
                (resultId: string) => this.toggleResultCollapse(resultId)
            )
        );
        
        // Register command to expand all results
        context.subscriptions.push(
            vscode.commands.registerCommand('laravel-tinker-notebook.expandAllResults', 
                () => this.setAllResultsCollapsedState(false)
            )
        );
        
        // Register command to collapse all results
        context.subscriptions.push(
            vscode.commands.registerCommand('laravel-tinker-notebook.collapseAllResults', 
                () => this.setAllResultsCollapsedState(true)
            )
        );
        
        // Register command to apply quick fixes to errors
        context.subscriptions.push(
            vscode.commands.registerCommand('laravel-tinker-notebook.applyErrorFix', 
                (errorInfo: { errorType: string, errorDescription: string, codeBlock: CodeBlock }) => 
                    this.applyErrorFix(errorInfo)
            )
        );
        
        // Register command to execute code when clicking on the decorator
        context.subscriptions.push(
            vscode.commands.registerCommand('laravel-tinker-notebook.runBlockFromDecorator', 
                (blockId: string) => this.runBlockFromDecorator(blockId)
            )
        );
        
        // Register event to initialize code blocks when a document is opened
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.initializeCodeBlocks(editor);
                }
            })
        );
        
        // Initialize code blocks for the active editor
        if (vscode.window.activeTextEditor) {
            this.initializeCodeBlocks(vscode.window.activeTextEditor);
        }
    }
    
    /**
     * Alterna el estado colapsado/expandido de un resultado
     */
    private toggleResultCollapse(resultId: string): void {
        const currentState = this.collapsedResults.get(resultId) || false;
        this.collapsedResults.set(resultId, !currentState);
        
        // Notify all active editors to update decorations
        vscode.window.visibleTextEditors.forEach(editor => {
            this.updateDecorations(editor);
        });
    }
    
    /**
     * Establece el estado colapsado/expandido para todos los resultados
     * @param collapsed true para colapsar todos, false para expandir todos
     */
    private setAllResultsCollapsedState(collapsed: boolean): void {
        // Update the state of all results
        for (const resultId of this.collapsedResults.keys()) {
            this.collapsedResults.set(resultId, collapsed);
        }
        
        // Notify all active editors to update decorations
        vscode.window.visibleTextEditors.forEach(editor => {
            this.updateDecorations(editor);
        });
        
        // Show information message
        const actionText = collapsed ? 'collapsed' : 'expanded';
        vscode.window.showInformationMessage(`All results have been ${actionText}`);
    }
    
    /**
     * Actualiza todas las decoraciones en un editor
     */
    private updateDecorations(editor: vscode.TextEditor): void {
        const document = editor.document;
        
        // Only process supported documents
        if (document.languageId !== 'markdown' && 
            !document.fileName.endsWith('.tinker') && 
            !document.fileName.endsWith('.tinker.md') && 
            !document.fileName.endsWith('.laravel-snippet')) {
            return;
        }
        
        // Find all code blocks in the document
        try {
            // We need an instance of DocumentParser to find code blocks
            // Since we don't have direct access, we simulate the search for code blocks
            // buscando decoraciones existentes
            
            // Clear existing decorations
            editor.setDecorations(this.resultDecorationType, []);
            
            // Update error decorations
            const errorDecorations: vscode.DecorationOptions[] = [];
            
            // Iterate through the error line map and create decorations
            for (const [resultId, errorLine] of this.errorLineMap.entries()) {
                // Only show errors for non-collapsed results
                if (!this.collapsedResults.get(resultId)) {
                    const line = document.lineAt(errorLine);
                    errorDecorations.push({
                        range: line.range,
                        hoverMessage: 'This line contains an error'
                    });
                }
            }
            
            // Apply error decorations
            editor.setDecorations(this.errorDecorationType, errorDecorations);
            
            // Update status decorators for code blocks
            this.updateCodeBlockStatusDecorations(editor, document);
            
            // Find existing results and update them
            // This is a simplification - in a real implementation, we should maintain
            // a record of all results and their associated code blocks
            
            // For now, we simply notify the user that they should re-execute the code
            // para ver los cambios en el estado de colapso
            vscode.window.showInformationMessage('Collapse state updated. To see the complete changes, run the code block again.');
        } catch (error) {
            console.error('Error updating decorations:', error);
        }
    }
    
    /**
     * Actualiza los decoradores de estado para los bloques de código
     */
    private updateCodeBlockStatusDecorations(editor: vscode.TextEditor, document: vscode.TextDocument): void {
        // Necesitamos una instancia de DocumentParser para encontrar bloques de código
        const documentParser = new DocumentParser();
        const codeBlocks = documentParser.findAllCodeBlocks(document);
        
        // Decoraciones para cada estado
        const actionDecorations: vscode.DecorationOptions[] = [];
        const errorDecorations: vscode.DecorationOptions[] = [];
        const successDecorations: vscode.DecorationOptions[] = [];
        
        for (const block of codeBlocks) {
            // Generate a unique ID for this code block
            const blockId = this.generateBlockId(block);
            const blockStatus = this.blockStatusMap.get(blockId) || 'ready';
            
            // Create a range for the first line of the code block (where the decorator will be displayed)
            const firstLineRange = new vscode.Range(
                block.range.start.line, 0,
                block.range.start.line, 0
            );
            
            // Create decoration based on status
            switch (blockStatus) {
                case 'ready':
                    const actionHoverMessage = new vscode.MarkdownString();
                    actionHoverMessage.isTrusted = true;
                    actionHoverMessage.appendMarkdown(`Click to run this code block\n\n`);
                    actionHoverMessage.appendMarkdown(`[Run Code](command:laravel-tinker-notebook.runBlockFromDecorator?${encodeURIComponent(JSON.stringify(blockId))})`);
                    
                    actionDecorations.push({
                        range: firstLineRange,
                        hoverMessage: actionHoverMessage
                    });
                    break;
                case 'error':
                    const errorHoverMessage = new vscode.MarkdownString();
                    errorHoverMessage.isTrusted = true;
                    errorHoverMessage.appendMarkdown(`This code block contains errors\n\n`);
                    errorHoverMessage.appendMarkdown(`[Try again](command:laravel-tinker-notebook.runBlockFromDecorator?${encodeURIComponent(JSON.stringify(blockId))})`);
                    
                    errorDecorations.push({
                        range: firstLineRange,
                        hoverMessage: errorHoverMessage
                    });
                    break;
                case 'success':
                    const successHoverMessage = new vscode.MarkdownString();
                    successHoverMessage.isTrusted = true;
                    successHoverMessage.appendMarkdown(`This code block executed successfully\n\n`);
                    successHoverMessage.appendMarkdown(`[Run again](command:laravel-tinker-notebook.runBlockFromDecorator?${encodeURIComponent(JSON.stringify(blockId))})`);
                    
                    successDecorations.push({
                        range: firstLineRange,
                        hoverMessage: successHoverMessage
                    });
                    break;
            }
        }
        
        // Apply decorations
        editor.setDecorations(this.codeBlockActionDecorationType, actionDecorations);
        editor.setDecorations(this.codeBlockErrorDecorationType, errorDecorations);
        editor.setDecorations(this.codeBlockSuccessDecorationType, successDecorations);
    }
    
    /**
     * Generates a unique ID for a code block
     */
    private generateBlockId(block: CodeBlock): string {
        return crypto.createHash('md5').update(block.code + block.range.start.line.toString()).digest('hex');
    }
    
    /**
     * Initializes code blocks in an editor, setting them as 'ready'
     */
    private initializeCodeBlocks(editor: vscode.TextEditor): void {
        const document = editor.document;
        
        // Only process supported documents
        if (document.languageId !== 'markdown' && 
            !document.fileName.endsWith('.tinker') && 
            !document.fileName.endsWith('.tinker.md') && 
            !document.fileName.endsWith('.laravel-snippet')) {
            return;
        }
        
        try {
            // Use DocumentParser to find all code blocks
            const documentParser = new DocumentParser();
            const codeBlocks = documentParser.findAllCodeBlocks(document);
            
            // Set all blocks as 'ready' if they don't have a previous state
            for (const block of codeBlocks) {
                const blockId = this.generateBlockId(block);
                if (!this.blockStatusMap.has(blockId)) {
                    this.blockStatusMap.set(blockId, 'ready');
                }
            }
            
            // Update decorations
            this.updateCodeBlockStatusDecorations(editor, document);
        } catch (error) {
            console.error('Error initializing code blocks:', error);
        }
    }
    
    /**
     * Executes a code block when clicking on the decorator
     */
    private runBlockFromDecorator(blockId: string): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const document = editor.document;
        
        try {
            // Use DocumentParser to find all code blocks
            const documentParser = new DocumentParser();
            const codeBlocks = documentParser.findAllCodeBlocks(document);
            
            // Find the block with the corresponding ID
            for (const block of codeBlocks) {
                const currentBlockId = this.generateBlockId(block);
                if (currentBlockId === blockId) {
                    // Execute the runBlock command with this block
                    vscode.commands.executeCommand('laravel-tinker-notebook.runBlock', block);
                    return;
                }
            }
        } catch (error) {
            console.error('Error executing block from decorator:', error);
        }
    }
    
    public async renderResult(
        editor: vscode.TextEditor, 
        codeBlock: CodeBlock, 
        result: ExecutionResult
    ): Promise<void> {
        const document = editor.document;
        
        // Generate a unique ID for this code block
        const blockId = this.generateBlockId(codeBlock);
        
        // Update the block status based on the result
        if (result.error) {
            this.blockStatusMap.set(blockId, 'error');
        } else {
            this.blockStatusMap.set(blockId, 'success');
        }
        
        // If it's a markdown file, we'll add the result as a new code block
        if (document.languageId === 'markdown') {
            await this.insertResultAsCodeBlock(editor, codeBlock, result);
        } else {
            // For .tinker files, show results using decorations
            this.renderResultAsDecoration(editor, codeBlock, result);
        }
        
        // Update decorations to show the new status
        this.updateDecorations(editor);
    }
    
    private async insertResultAsCodeBlock(
        editor: vscode.TextEditor,
        codeBlock: CodeBlock,
        result: ExecutionResult
    ): Promise<void> {
        const document = editor.document;
        const endPosition = codeBlock.range.end;
        const endOfLine = document.lineAt(endPosition.line).range.end;
        
        // Generate a unique ID for this result
        const resultId = crypto.createHash('md5')
            .update(`${codeBlock.code}-${Date.now()}`)
            .digest('hex');
            
        // Format the output
        let resultText: string;
        let headerText = '';
        let formattedOutput = result.output;
        let languageId = 'plaintext';
        
        // Format the output if it's not raw
        if (!result.isRaw && !result.error) {
            const formatter = this.formatterFactory.getFormatter(result.output);
            formattedOutput = formatter.format(result.output);
            languageId = formatter.getLanguageId();
        }
        
        // Add session information if available
        if (result.sessionId) {
            headerText = result.sessionActive 
                ? `// Session: ${result.sessionId} (active)\n` 
                : `// Session: ${result.sessionId} (inactive)\n`;
            
            // Add available variables
            if (result.variables && result.variables.length > 0) {
                headerText += `// Variables: ${result.variables.join(', ')}\n`;
            }
        }
        
        // Añadir botones para colapsar/expandir, copiar y exportar
        const collapseButton = `<a href="command:laravel-tinker-notebook.toggleResultCollapse?${encodeURIComponent(JSON.stringify([resultId]))}">[Colapsar/Expandir]</a>`;
        const copyButton = `<a href="command:laravel-tinker-notebook.copyResult">[Copiar]</a>`;
        const exportButton = `<a href="command:laravel-tinker-notebook.exportResult">[Exportar]</a>`;
        
        // Añadir botones al encabezado
        const buttonsHeader = `<!-- ${collapseButton} ${copyButton} ${exportButton} -->\n`;
        
        if (result.error) {
            resultText = `\n\n${buttonsHeader}\`\`\`\n${headerText}// Error\n${result.error}\n\`\`\`\n`;
            
            // Try to extract information from the error line
            this.parseErrorAndHighlight(result.error, codeBlock, resultId);
        } else {
            resultText = `\n\n${buttonsHeader}\`\`\`${languageId}\n${headerText}// Result\n${formattedOutput}\n\`\`\`\n`;
            
            // Si no hay error, eliminar cualquier resaltado anterior para este resultado
            this.errorLineMap.delete(resultId);
        }
        
        // Insert the result
        await editor.edit(editBuilder => {
            editBuilder.insert(endOfLine, resultText);
        });
    }
    
    /**
     * Analiza un mensaje de error para identificar la línea que causó el error
     * @param errorMessage Mensaje de error
     * @param codeBlock Bloque de código donde ocurrió el error
     * @param resultId Identificador único del resultado
     * @returns Información detallada sobre el error analizado
     */
    private parseErrorAndHighlight(errorMessage: string, codeBlock: CodeBlock, resultId: string): { errorLine: number, errorType: string, errorDescription: string } {
        try {
            // Object to store detailed error information
            let errorInfo = {
                errorLine: codeBlock.range.start.line, // By default, first line
                errorType: 'Error desconocido',
                errorDescription: errorMessage
            };
            
            // Patrones para tipos comunes de errores de PHP
            const errorTypePatterns = [
                // Errores de sintaxis
                { pattern: /Parse error:\s*(.+?)\s+in/i, type: 'Error de sintaxis' },
                { pattern: /syntax error, unexpected\s+(.+?)\s+in/i, type: 'Error de sintaxis' },
                { pattern: /unexpected end of file/i, type: 'Error de sintaxis' },
                
                // Errores fatales
                { pattern: /Fatal error:\s*(.+?)\s+in/i, type: 'Error fatal' },
                { pattern: /Uncaught Error:\s*(.+?)\s+in/i, type: 'Error fatal' },
                { pattern: /Maximum execution time of (\d+) seconds exceeded/i, type: 'Tiempo de ejecución excedido' },
                { pattern: /Allowed memory size of (\d+) bytes exhausted/i, type: 'Memoria agotada' },
                
                // Advertencias y avisos
                { pattern: /Warning:\s*(.+?)\s+in/i, type: 'Advertencia' },
                { pattern: /Notice:\s*(.+?)\s+in/i, type: 'Aviso' },
                { pattern: /Deprecated:\s*(.+?)\s+in/i, type: 'Función obsoleta' },
                
                // Excepciones
                { pattern: /ErrorException.*?:\s*(.+?)\s+in/i, type: 'Excepción' },
                { pattern: /Exception\s+message:\s*['"](.*?)['"]\s+in/i, type: 'Excepción' },
                { pattern: /\w+Exception:\s*(.+?)\s+in/i, type: 'Excepción' },
                
                // Errores de clase
                { pattern: /Class ['"](.+?)['"] not found/i, type: 'Clase no encontrada' },
                { pattern: /Class ['"](.+?)['"] not instantiable/i, type: 'Clase no instanciable' },
                { pattern: /Cannot instantiate abstract class\s+([\w\\]+)/i, type: 'Clase abstracta no instanciable' },
                { pattern: /Interface ['"](.+?)['"] not found/i, type: 'Interface no encontrada' },
                { pattern: /Trait ['"](.+?)['"] not found/i, type: 'Trait no encontrado' },
                
                // Errores de variables
                { pattern: /Undefined variable.*?\$(\w+)/i, type: 'Variable no definida' },
                { pattern: /Cannot access uninitialized variable\s+\$(\w+)/i, type: 'Variable no inicializada' },
                
                // Function and method errors
                { pattern: /Call to undefined function\s+(\w+)/i, type: 'Función no definida' },
                { pattern: /Call to undefined method\s+([\w\\]+)::(\w+)/i, type: 'Método no definido' },
                { pattern: /Call to private method\s+([\w\\]+)::(\w+)/i, type: 'Método privado' },
                { pattern: /Call to protected method\s+([\w\\]+)::(\w+)/i, type: 'Método protegido' },
                { pattern: /Too few arguments to function\s+(\w+)/i, type: 'Argumentos insuficientes' },
                { pattern: /Too many arguments to function\s+(\w+)/i, type: 'Demasiados argumentos' },
                
                // Errores de arrays y propiedades
                { pattern: /Trying to access array offset on value of type (\w+)/i, type: 'Error de acceso a array' },
                { pattern: /Cannot use object of type\s+([\w\\]+)\s+as array/i, type: 'Error de acceso a array' },
                { pattern: /Undefined index:\s*(\w+)/i, type: 'Índice no definido' },
                { pattern: /Undefined array key ['"]?(\w+)['"]?/i, type: 'Índice no definido' },
                { pattern: /Undefined property:\s*([\w\\]+)::\$(\w+)/i, type: 'Propiedad no definida' },
                { pattern: /Cannot access private property\s+([\w\\]+)::\$(\w+)/i, type: 'Propiedad privada' },
                { pattern: /Cannot access protected property\s+([\w\\]+)::\$(\w+)/i, type: 'Propiedad protegida' },
                
                // Errores de tipo
                { pattern: /Type error:\s*(.+?)\s+in/i, type: 'Error de tipo' },
                { pattern: /Argument (\d+) passed to\s+(.+?)\s+must be of the type\s+(.+?),\s+(.+?)\s+given/i, type: 'Tipo de argumento incorrecto' },
                { pattern: /Cannot assign\s+(.+?)\s+to property\s+(.+?)\s+of type\s+(.+?)/i, type: 'Tipo de propiedad incorrecto' },
                { pattern: /Return value of\s+(.+?)\s+must be of the type\s+(.+?),\s+(.+?)\s+returned/i, type: 'Tipo de retorno incorrecto' },
                
                // Errores de Laravel
                { pattern: /SQLSTATE\[(.+?)\]\s*(.+?)\s+in/i, type: 'Error de SQL' },
                { pattern: /No query results for model\s+\[([\w\\]+)\]/i, type: 'Modelo no encontrado' },
                { pattern: /Relation\s+['"](.+?)['"]\s+does not exist/i, type: 'Relación no encontrada' },
                { pattern: /Unknown column\s+['"](.+?)['"]\s+in\s+['"](.+?)['"]\s+in/i, type: 'Columna no encontrada' },
                { pattern: /Table\s+['"](.+?)['"]\s+doesn't exist/i, type: 'Tabla no encontrada' },
                
                // Division by zero errors
                { pattern: /Division by zero/i, type: 'División por cero' }
            ];
            
            // Extract error type and description
            for (const { pattern, type } of errorTypePatterns) {
                const match = errorMessage.match(pattern);
                if (match) {
                    errorInfo.errorType = type;
                    
                    // Generate detailed descriptions based on error type
                    switch (type) {
                        case 'Error de sintaxis':
                            errorInfo.errorDescription = match[1] ? 
                                `Error de sintaxis: ${match[1]}` : 
                                'Error de sintaxis en el código PHP';
                            break;
                            
                        case 'Clase no encontrada':
                            const className = match[1] || 'desconocida';
                            errorInfo.errorDescription = `La clase '${className}' no fue encontrada. Verifica que esté definida o importada correctamente.`;
                            break;
                            
                        case 'Variable no definida':
                            const varName = match[1] || 'desconocida';
                            errorInfo.errorDescription = `La variable '$${varName}' no ha sido definida antes de ser utilizada.`;
                            break;
                            
                        case 'Función no definida':
                            const funcName = match[1] || 'desconocida';
                            errorInfo.errorDescription = `La función '${funcName}()' no está definida o no es accesible.`;
                            break;
                            
                        case 'Método no definido':
                            const className2 = match[1] || 'Clase';
                            const methodName = match[2] || 'método';
                            errorInfo.errorDescription = `El método '${methodName}()' no existe en la clase '${className2}'.`;
                            break;
                            
                        case 'Índice no definido':
                            const indexName = match[1] || 'desconocido';
                            errorInfo.errorDescription = `Se intentó acceder al índice '${indexName}' que no existe en el array.`;
                            break;
                            
                        case 'Propiedad no definida':
                            const className3 = match[1] || 'Clase';
                            const propName = match[2] || 'propiedad';
                            errorInfo.errorDescription = `La propiedad '$${propName}' no existe en la clase '${className3}'.`;
                            break;
                            
                        case 'Error de acceso a array':
                            const typeName = match[1] || 'no array';
                            errorInfo.errorDescription = `Se intentó acceder como array a un valor de tipo '${typeName}'.`;
                            break;
                            
                        case 'Error de SQL':
                            const sqlState = match[1] || '';
                            const sqlError = match[2] || 'Error en la consulta SQL';
                            errorInfo.errorDescription = `Error SQL [${sqlState}]: ${sqlError}`;
                            break;
                            
                        case 'Modelo no encontrado':
                            const modelName = match[1] || 'desconocido';
                            errorInfo.errorDescription = `No se encontraron resultados para el modelo '${modelName}'.`;
                            break;
                            
                        case 'Tiempo de ejecución excedido':
                            const seconds = match[1] || '30';
                            errorInfo.errorDescription = `La operación excedió el tiempo máximo de ejecución (${seconds} segundos).`;
                            break;
                            
                        default:
                            // For other error types, use the captured description or the original message
                            if (match[1]) {
                                errorInfo.errorDescription = match[1];
                            } else {
                                // Try to extract a cleaner description from the error message
                                const cleanedMessage = errorMessage
                                    .replace(/\s+in\s+.*?:\d+$/i, '') // Eliminar la parte "in file:line"
                                    .replace(/^(PHP )?\w+:\s*/i, '')  // Eliminar prefijos como "PHP Fatal error:"
                                    .trim();
                                    
                                errorInfo.errorDescription = cleanedMessage || errorMessage;
                            }
                    }
                    break;
                }
            }
            
            // Patterns for line numbers in PHP errors
            const lineNumberPatterns = [
                /on line (\d+)/, // "PHP Parse error: syntax error, unexpected ';' in ... on line 5"
                /in.*? on line (\d+)/, // "in /path/to/file.php on line 10"
                /line (\d+)/, // Simpler variant
                /:([0-9]+)$/, // "in /path/to/file.php:10"
                /\((\d+)\)/ // "ErrorException(42): Undefined variable"
            ];
            
            // Find matches with line patterns
            for (const pattern of lineNumberPatterns) {
                const match = errorMessage.match(pattern);
                if (match && match[1]) {
                    const lineNumber = parseInt(match[1], 10);
                    
                    // Adjust the line number relative to the code block
                    errorInfo.errorLine = Math.min(
                        codeBlock.range.start.line + lineNumber - 1,
                        codeBlock.range.end.line
                    );
                    break;
                }
            }
            
            // Save the error line for this result
            this.errorLineMap.set(resultId, errorInfo.errorLine);
            
            return errorInfo;
        } catch (error) {
            console.error('Error analyzing error message:', error);
            return {
                errorLine: codeBlock.range.start.line,
                errorType: 'Analysis Error',
                errorDescription: 'Could not analyze the error message'
            };
        }
    }
    
    /**
     * Crea decoraciones de tipo específico para diferentes tipos de errores
     * @param errorType Tipo de error para el que crear la decoración
     * @returns Tipo de decoración específico para el error
     */
    private getErrorDecorationType(errorType: string): vscode.TextEditorDecorationType {
        // Definir estilos base para todos los errores
        const baseErrorStyle = {
            backgroundColor: 'rgba(255, 0, 0, 0.05)',
            borderWidth: '0 0 0 2px',
            borderStyle: 'solid',
            borderColor: 'red',
            fontStyle: 'italic'
        };
        
        // Customize styles based on error type
        switch (errorType) {
            case 'Error de sintaxis':
                return vscode.window.createTextEditorDecorationType({
                    ...baseErrorStyle,
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    borderColor: '#ff0000',
                    overviewRulerColor: '#ff0000',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Error fatal':
                return vscode.window.createTextEditorDecorationType({
                    ...baseErrorStyle,
                    backgroundColor: 'rgba(255, 0, 0, 0.15)',
                    borderColor: '#cc0000',
                    overviewRulerColor: '#cc0000',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Advertencia':
                return vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    borderWidth: '0 0 0 2px',
                    borderStyle: 'solid',
                    borderColor: '#ffa500',
                    fontStyle: 'italic',
                    overviewRulerColor: '#ffa500',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Aviso':
                return vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(255, 255, 0, 0.1)',
                    borderWidth: '0 0 0 2px',
                    borderStyle: 'solid',
                    borderColor: '#ffcc00',
                    fontStyle: 'italic',
                    overviewRulerColor: '#ffcc00',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Variable no definida':
            case 'Función no definida':
            case 'Método no definido':
            case 'Clase no encontrada':
                return vscode.window.createTextEditorDecorationType({
                    ...baseErrorStyle,
                    backgroundColor: 'rgba(128, 0, 128, 0.1)',
                    borderColor: '#800080',
                    overviewRulerColor: '#800080',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Índice no definido':
            case 'Propiedad no definida':
            case 'Error de acceso a array':
                return vscode.window.createTextEditorDecorationType({
                    ...baseErrorStyle,
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    borderColor: '#0000ff',
                    overviewRulerColor: '#0000ff',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            case 'Error de SQL':
                return vscode.window.createTextEditorDecorationType({
                    ...baseErrorStyle,
                    backgroundColor: 'rgba(0, 128, 128, 0.1)',
                    borderColor: '#008080',
                    overviewRulerColor: '#008080',
                    overviewRulerLane: vscode.OverviewRulerLane.Right
                });
                
            default:
                return vscode.window.createTextEditorDecorationType(baseErrorStyle);
        }
    }
    
    /**
     * Crea un ícono de error para mostrar en el margen izquierdo
     * @param errorType Tipo de error para el que crear el ícono
     * @returns Tipo de decoración con ícono para el error
     */
    private getErrorGutterIconType(errorType: string): vscode.TextEditorDecorationType {
        // Define icons based on error type
        let gutterIconPath: string;
        
        switch (errorType) {
            case 'Error de sintaxis':
            case 'Error fatal':
                gutterIconPath = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTguNiAyLjRhLjkuOSAwIDAgMC0xLjIgMEw0LjggNC45Yy0uMy4zLS4zLjkgMCAxLjJsNi42IDYuNmMuMy4zLjkuMyAxLjIgMGwyLjYtMi42Yy4zLS4zLjMtLjkgMC0xLjJMOC42IDIuNHoiIGZpbGw9IiNmZjAwMDAiLz48L3N2Zz4=';
                break;
                
            case 'Advertencia':
            case 'Aviso':
                gutterIconPath = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTcuNTYgMS4wNGMuMjYtLjQ1LjkxLS40NSAxLjE3IDBsNi44NyAxMS45M2MuMjYuNDUtLjA2IDEuMDItLjU4IDEuMDJIMS4yOGMtLjUyIDAtLjg0LS41Ny0uNTgtMS4wMkw3LjU2IDEuMDR6TTggNS41YS41LjUgMCAwIDAtLjUuNXYzYS41LjUgMCAwIDAgLjUuNWguMDFhLjUuNSAwIDAgMCAuNS0uNVY2YS41LjUgMCAwIDAtLjUtLjVIOHptLjUgNS41YS41LjUgMCAwIDEtLjUuNWgtLjAxYS41LjUgMCAwIDEtLjUtLjVWMTFhLjUuNSAwIDAgMSAuNS0uNUg4YS41LjUgMCAwIDEgLjUuNXYuMDJ6IiBmaWxsPSIjZmZhNTAwIi8+PC9zdmc+';
                break;
                
            default:
                gutterIconPath = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTggMTVBNyA3IDAgMSAwIDggMWE3IDcgMCAwIDAgMCAxNHpNNyA0aDJ2NUg3VjR6bTIgOEg3VjdoMnY1eiIgZmlsbD0iI2ZmMDAwMCIvPjwvc3ZnPg==';
        }
        
        return vscode.window.createTextEditorDecorationType({
            gutterIconPath: vscode.Uri.parse(gutterIconPath),
            gutterIconSize: 'contain'
        });
    }
    
    /**
     * Renderiza el resultado como una decoración en el editor
     * @param editor Editor de texto donde mostrar la decoración
     * @param codeBlock Bloque de código al que pertenece el resultado
     * @param result Resultado de la ejecución
     */
    private renderResultAsDecoration(
        editor: vscode.TextEditor,
        codeBlock: CodeBlock,
        result: ExecutionResult
    ): void {
        const decorations: vscode.DecorationOptions[] = [];
        
        // Generate a unique ID for this result
        const resultId = crypto.createHash('md5')
            .update(`${codeBlock.code}-${Date.now()}`)
            .digest('hex');
            
        // Verificar si este resultado está colapsado
        const isCollapsed = this.collapsedResults.get(resultId) || false;
        
        // Create the result text
        let resultText = '';
        let errorInfo: { errorLine: number, errorType: string, errorDescription: string } | null = null;
        
        if (result.error) {
            // Analizar el error para obtener información detallada
            errorInfo = this.parseErrorAndHighlight(result.error, codeBlock, resultId);
            
            // Show summarized error information in the decoration
            resultText = `// Error: ${errorInfo.errorType} - ${errorInfo.errorDescription.substring(0, 50)}${errorInfo.errorDescription.length > 50 ? '...' : ''}`;
            
            // Create specific decoration for the error line
            if (errorInfo.errorLine >= codeBlock.range.start.line && errorInfo.errorLine <= codeBlock.range.end.line) {
                // Get the complete line where the error occurred
                const errorLineRange = editor.document.lineAt(errorInfo.errorLine).range;
                
                // Create decoration to highlight the error line
                const errorLineDecoration: vscode.DecorationOptions = {
                    range: errorLineRange,
                    hoverMessage: new vscode.MarkdownString(`**${errorInfo.errorType}**: ${errorInfo.errorDescription}`)
                };
                
                // Get specific decoration for this error type
                const errorDecorationType = this.getErrorDecorationType(errorInfo.errorType);
                editor.setDecorations(errorDecorationType, [errorLineDecoration]);
                
                // Add icon in the left margin
                const errorGutterIconType = this.getErrorGutterIconType(errorInfo.errorType);
                editor.setDecorations(errorGutterIconType, [{ range: errorLineRange }]);
            }
        } else {
            // If collapsed, show only a summary
            if (isCollapsed) {
                resultText = `// Result: [Collapsed] (Click to expand)`;
            } else {
                resultText = `// Result: ${result.output.substring(0, 100)}${result.output.length > 100 ? '...' : ''}`;
            }
        }
        
        // Add session information if available
        if (result.sessionId) {
            const sessionInfo = result.sessionActive 
                ? `[Session: ${result.sessionId.substring(0, 8)}... active]` 
                : `[Inactive session]`;
            resultText = `${resultText} ${sessionInfo}`;
        }
        
        // Add variable information if available
        if (result.variables && result.variables.length > 0 && !isCollapsed) {
            const variablesList = result.variables.join(', ');
            resultText = `${resultText} [Variables: ${variablesList}]`;
        }
        
        // Create the decoration for the result text
        const endPos = codeBlock.range.end;
        const decoration: vscode.DecorationOptions = {
            range: new vscode.Range(endPos, endPos),
            renderOptions: {
                after: {
                    contentText: resultText,
                    color: result.error ? 'red' : (result.sessionActive ? '#3a9c3a' : 'green'),
                    fontStyle: result.error ? 'italic' : 'normal',
                    fontWeight: result.error ? 'bold' : 'normal',
                    backgroundColor: result.error ? 'rgba(255, 0, 0, 0.05)' : 'transparent'
                }
            },
            hoverMessage: this.createHoverMessage(result, resultId)
        };
        
        decorations.push(decoration);
        
        // Apply the decoration
        editor.setDecorations(this.resultDecorationType, decorations);
    }
    
    /**
     * Creates a popup message with detailed information about the result and session
     */
    /**
     * Provides suggestions to resolve different types of errors
     * @param errorType Identified error type
     * @param errorDescription Error description
     * @returns List of suggestions to resolve the error
     */
    /**
     * Provides suggestions to resolve different types of errors
     * @param errorType Identified error type
     * @param errorDescription Error description
     * @returns List of suggestions to resolve the error
     */
    private getErrorSuggestions(errorType: string, errorDescription: string): string[] {
        const suggestions: string[] = [];
        
        switch (errorType) {
            case 'Error de sintaxis':
                suggestions.push('Check that all braces, parentheses, and semicolons are correctly placed.');
                suggestions.push('Make sure that string literals are properly closed with quotes.');
                suggestions.push('Review the syntax of control structures (if, for, while, etc.).');
                break;
                
            case 'Error fatal':
                suggestions.push('Verify that all classes and functions used are defined or imported.');
                suggestions.push('Check that you are not trying to access methods or properties of a null object.');
                break;
                
            case 'Clase no encontrada':
                const className = errorDescription.match(/['"]([^'"]+)['"]/)?.[1] || '';
                suggestions.push(`Check that the class '${className}' is defined in your project.`);
                suggestions.push(`Make sure you have correctly imported the namespace with 'use ${className}'.`);
                suggestions.push('Check that the class name is spelled correctly, respecting uppercase and lowercase.');
                break;
                
            case 'Variable no definida':
                const varName = errorDescription.match(/\$(\w+)/)?.[1] || '';
                suggestions.push(`Define the variable '$${varName}' before using it.`);
                suggestions.push(`Check the spelling of the variable '$${varName}'.`);
                break;
                
            case 'Función no definida':
                const funcName = errorDescription.match(/(\w+)/)?.[1] || '';
                suggestions.push(`Verify that the function '${funcName}' is defined in your project.`);
                suggestions.push(`Check if you need to import a library that contains this function.`);
                break;
                
            case 'Método no definido':
                const methodInfo = errorDescription.match(/([\w\\]+)::(\w+)/i);
                const className2 = methodInfo?.[1] || '';
                const methodName = methodInfo?.[2] || '';
                suggestions.push(`Verify that the class '${className2}' has a method called '${methodName}'.`);
                suggestions.push(`Check if the method '${methodName}' is public or if you need a static method.`);
                break;
                
            case 'Índice no definido':
                const indexName = errorDescription.match(/(\w+)/)?.[1] || '';
                suggestions.push(`Verify that the index '${indexName}' exists in the array before accessing it.`);
                suggestions.push(`Use isset() or array_key_exists() to check if the index exists.`);
                break;
                
            case 'Propiedad no definida':
                const propInfo = errorDescription.match(/([\w\\]+)::\$(\w+)/i);
                const className3 = propInfo?.[1] || '';
                const propName = propInfo?.[2] || '';
                suggestions.push(`Verify that the class '${className3}' has a property called '$${propName}'.`);
                suggestions.push(`Check if the property '$${propName}' is public or if you need a getter.`);
                break;
                
            case 'Error de acceso a array':
                suggestions.push('Verify that you are trying to access a value that is actually an array.');
                suggestions.push('Use is_array() to check if a variable is an array before accessing its elements.');
                break;
                
            default:
                suggestions.push('Carefully review the error message to identify the cause.');
                suggestions.push('Check the syntax and logic of your code.');
                break;
        }
        
        return suggestions;
    }
    
    /**
     * Generates correction code based on the error type
     * @param errorType Identified error type
     * @param errorDescription Error description
     * @returns Correction code for the error
     */
    private generateErrorFix(errorType: string, errorDescription: string): string | null {
        switch (errorType) {
            case 'Variable no definida':
                const varName = errorDescription.match(/\$(\w+)/)?.[1] || '';
                if (varName) {
                    return `$${varName} = null; // Initialize variable`;
                }
                break;
                
            case 'Clase no encontrada':
                const className = errorDescription.match(/['"]([^'"]+)['"]/)?.[1] || '';
                if (className) {
                    // Try to extract the namespace
                    const namespaceParts = className.split('\\');
                    const shortClassName = namespaceParts[namespaceParts.length - 1];
                    return `use ${className}; // Import class`;
                }
                break;
                
            case 'Índice no definido':
                const indexName = errorDescription.match(/(\w+)/)?.[1] || '';
                if (indexName) {
                    return `// Check if the index exists before accessing\nif (isset($array['${indexName}'])) {\n    $value = $array['${indexName}'];\n}`;
                }
                break;
                
            case 'Error de acceso a array':
                return `// Check if the variable is an array before accessing\nif (is_array($variable)) {\n    $value = $variable[0];\n}`;
                
            case 'Función no definida':
                const funcName = errorDescription.match(/(\w+)/)?.[1] || '';
                if (funcName) {
                    return `// Define the missing function\nfunction ${funcName}() {\n    // Implement the function\n    return null;\n}`;
                }
                break;
                
            case 'Método no definido':
                const methodInfo = errorDescription.match(/([\w\\]+)::(\w+)/i);
                const methodName = methodInfo?.[2] || '';
                if (methodName) {
                    return `// Implement the missing method in the class\npublic function ${methodName}() {\n    // Implement the method\n    return null;\n}`;
                }
                break;
                
            default:
                return null;
        }
        
        return null;
    }
    
    /**
     * Applies a quick fix to an error
     * @param errorInfo Information about the error to fix
     */
    private async applyErrorFix(errorInfo: { errorType: string, errorDescription: string, codeBlock: CodeBlock }): Promise<void> {
        try {
            const { errorType, errorDescription, codeBlock } = errorInfo;
            
            // Generate correction code
            const fixCode = this.generateErrorFix(errorType, errorDescription);
            
            if (!fixCode) {
                vscode.window.showInformationMessage('Could not generate an automatic solution for this error.');
                return;
            }
            
            // Get the active editor
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('There is no active editor to apply the solution.');
                return;
            }
            
            // Determine the position to insert the correction
            // By default, at the end of the code block
            const insertPosition = codeBlock.range.end;
            
            // Apply the correction
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, '\n' + fixCode);
            });
            
            vscode.window.showInformationMessage('Solution applied. Review the generated code and adjust it as needed.');
            
        } catch (error) {
            console.error('Error applying the solution:', error);
            vscode.window.showErrorMessage('Error applying the solution: ' + error);
        }
    }
    
    private createHoverMessage(result: ExecutionResult, resultId?: string): vscode.MarkdownString {
        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.isTrusted = true; // Enable command links
        
        // Add buttons for copying, exporting and collapsing/expanding
        const buttons = [`[Copy to Clipboard](command:laravel-tinker-notebook.copyResult)`, 
                         `[Export Result](command:laravel-tinker-notebook.exportResult)`];
                         
        if (resultId) {
            const isCollapsed = this.collapsedResults.get(resultId) || false;
            const collapseText = isCollapsed ? 'Expandir' : 'Colapsar';
            buttons.push(`[${collapseText}](command:laravel-tinker-notebook.toggleResultCollapse?${encodeURIComponent(JSON.stringify([resultId]))})`); 
        }
        
        // Añadir botones para expandir/colapsar todos los resultados
        buttons.push(`[Expandir Todos](command:laravel-tinker-notebook.expandAllResults)`);
        buttons.push(`[Colapsar Todos](command:laravel-tinker-notebook.collapseAllResults)`);
        
        hoverMessage.appendMarkdown(`${buttons.join(' | ')}\n\n`);
        
        // Verificar si este resultado está colapsado
        const isCollapsed = resultId ? (this.collapsedResults.get(resultId) || false) : false;
        
        // Si está colapsado, mostrar solo un resumen
        if (isCollapsed) {
            hoverMessage.appendMarkdown(`### Resultado (Colapsado)\n\n`);
            hoverMessage.appendMarkdown(`Haz clic en 'Expandir' para ver el resultado completo.\n\n`);
        } else {
            let formattedOutput = result.output;
            let languageId = 'plaintext';
            
            // Format the output if it's not raw
            if (!result.isRaw && !result.error) {
                const formatter = this.formatterFactory.getFormatter(result.output);
                formattedOutput = formatter.format(result.output);
                languageId = formatter.getLanguageId();
            }
            
            if (result.error) {
                // Analizar el error para obtener información detallada
                const codeBlockForFix = { range: new vscode.Range(0, 0, 0, 0), code: '', language: '' };
                if (resultId && resultId.startsWith('hover-')) {
                    // Si es un hover, usar un bloque de código vacío
                    codeBlockForFix.range = new vscode.Range(0, 0, 0, 0);
                } else {
                    // Intentar obtener el bloque de código real asociado al resultado
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        // Buscar la línea con error en el mapa
                        const errorLine = this.errorLineMap.get(resultId || '');
                        if (errorLine !== undefined) {
                            // Crear un rango que abarque toda la línea
                            const line = editor.document.lineAt(errorLine);
                            codeBlockForFix.range = new vscode.Range(errorLine, 0, errorLine, line.text.length);
                            codeBlockForFix.code = line.text;
                        }
                    }
                }
                
                const errorInfo = this.parseErrorAndHighlight(result.error, codeBlockForFix, resultId || 'hover-' + Date.now());
                
                // Mostrar información detallada del error con estilo mejorado
                hoverMessage.appendMarkdown(`### ❌ Error: ${errorInfo.errorType}\n\n`);
                hoverMessage.appendMarkdown(`**Descripción:** ${errorInfo.errorDescription}\n\n`);
                
                // Mostrar información de la línea donde ocurrió el error
                if (codeBlockForFix.code) {
                    const lineNumber = errorInfo.errorLine + 1; // Convertir a 1-indexed para mostrar al usuario
                    hoverMessage.appendMarkdown(`**Línea ${lineNumber}:** \`${codeBlockForFix.code.trim()}\`\n\n`);
                }
                
                // Mostrar mensaje completo con formato mejorado
                hoverMessage.appendMarkdown(`**Mensaje completo:**\n\n\`\`\`php\n${result.error}\n\`\`\`\n\n`);
                
                // Verificar si hay una solución rápida disponible
                const fixCode = this.generateErrorFix(errorInfo.errorType, errorInfo.errorDescription);
                if (fixCode) {
                    // Añadir botón para aplicar la solución rápida
                    const errorInfoForCommand = {
                        errorType: errorInfo.errorType,
                        errorDescription: errorInfo.errorDescription,
                        codeBlock: codeBlockForFix
                    };
                    
                    hoverMessage.appendMarkdown(`**Solución rápida disponible:** [Aplicar solución](command:laravel-tinker-notebook.applyErrorFix?${encodeURIComponent(JSON.stringify([errorInfoForCommand]))})\n\n`);
                    
                    // Mostrar vista previa del código de corrección
                    hoverMessage.appendMarkdown(`**Vista previa de la solución:**\n\n\`\`\`php\n${fixCode}\n\`\`\`\n\n`);
                }
                
                // Añadir sugerencias para solucionar errores comunes con formato mejorado
                const suggestions = this.getErrorSuggestions(errorInfo.errorType, errorInfo.errorDescription);
                if (suggestions.length > 0) {
                    hoverMessage.appendMarkdown(`### 💡 Sugerencias de solución\n\n`);
                    suggestions.forEach((suggestion, index) => {
                        hoverMessage.appendMarkdown(`**${index + 1}.** ${suggestion}\n\n`);
                    });
                }
                
                // Añadir enlaces a documentación relevante según el tipo de error
                hoverMessage.appendMarkdown(`### 📚 Recursos adicionales\n\n`);
                
                switch (errorInfo.errorType) {
                    case 'Error de sintaxis':
                        hoverMessage.appendMarkdown(`- [Manual de PHP: Sintaxis básica](https://www.php.net/manual/es/language.basic-syntax.php)\n`);
                        break;
                    case 'Clase no encontrada':
                        hoverMessage.appendMarkdown(`- [Laravel: Autoloading](https://laravel.com/docs/autoloading)\n`);
                        hoverMessage.appendMarkdown(`- [PHP: Namespaces](https://www.php.net/manual/es/language.namespaces.php)\n`);
                        break;
                    case 'Método no definido':
                    case 'Propiedad no definida':
                        hoverMessage.appendMarkdown(`- [Laravel: Eloquent ORM](https://laravel.com/docs/eloquent)\n`);
                        hoverMessage.appendMarkdown(`- [PHP: Clases y Objetos](https://www.php.net/manual/es/language.oop5.php)\n`);
                        break;
                    case 'Variable no definida':
                        hoverMessage.appendMarkdown(`- [PHP: Variables](https://www.php.net/manual/es/language.variables.php)\n`);
                        break;
                    case 'Error de acceso a array':
                    case 'Índice no definido':
                        hoverMessage.appendMarkdown(`- [PHP: Arrays](https://www.php.net/manual/es/language.types.array.php)\n`);
                        break;
                    default:
                        hoverMessage.appendMarkdown(`- [Manual de PHP](https://www.php.net/manual/es/)\n`);
                        hoverMessage.appendMarkdown(`- [Documentación de Laravel](https://laravel.com/docs)\n`);
                }
                
                hoverMessage.appendMarkdown(`\n`);
            } else {
                hoverMessage.appendMarkdown(`### Resultado\n\n\`\`\`${languageId}\n${formattedOutput}\n\`\`\`\n\n`);
            }
            
            // Añadir información de sesión con formato mejorado
            if (result.sessionId) {
                const sessionStatusIcon = result.sessionActive ? '🟢' : '🔴'; // Verde o rojo
                const sessionStatus = result.sessionActive ? 'Activa' : 'Inactiva';
                
                hoverMessage.appendMarkdown(`### ${sessionStatusIcon} Información de Sesión\n\n`);
                hoverMessage.appendMarkdown(`- **ID de Sesión**: \`${result.sessionId}\`\n`);
                hoverMessage.appendMarkdown(`- **Estado**: ${sessionStatus}\n`);
                hoverMessage.appendMarkdown(`- **Tiempo de ejecución**: ${result.executionTime ? `${result.executionTime} ms` : 'No disponible'}\n`);
                
                // Añadir comandos para gestionar la sesión
                hoverMessage.appendMarkdown(`\n**Acciones de sesión:**\n`);
                hoverMessage.appendMarkdown(`- [Nueva Sesión](command:laravel-tinker-notebook.newSession) | `);
                hoverMessage.appendMarkdown(`[Cerrar Sesión](command:laravel-tinker-notebook.closeSession?${encodeURIComponent(JSON.stringify([result.sessionId]))})\n\n`);
                
                if (result.variables && result.variables.length > 0) {
                    hoverMessage.appendMarkdown(`### 📊 Variables Disponibles\n\n`);
                    result.variables.forEach(variable => {
                        hoverMessage.appendMarkdown(`- \`${variable}\`\n`);
                    });
                    hoverMessage.appendMarkdown(`\n`);
                }
            }
        }
        
        return hoverMessage;
    }
}
