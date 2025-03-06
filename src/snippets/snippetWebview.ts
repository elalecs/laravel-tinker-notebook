import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SnippetManager, CodeSnippet } from './snippetManager';

export class SnippetWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'laravel-tinker-notebook.snippetLibrary';
    private _view?: vscode.WebviewView;
    private snippetManager: SnippetManager;

    constructor(
        private readonly context: vscode.ExtensionContext,
        snippetManager: SnippetManager
    ) {
        this.snippetManager = snippetManager;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'getSnippets':
                    this._view?.webview.postMessage({
                        command: 'snippets',
                        snippets: this.snippetManager.getAllSnippets()
                    });
                    break;
                case 'insertSnippet':
                    this.insertSnippet(message.snippetId);
                    break;
                case 'createSnippet':
                    this.createSnippetFromSelection();
                    break;
                case 'updateSnippet':
                    this.updateSnippet(message.snippet);
                    break;
                case 'deleteSnippet':
                    this.deleteSnippet(message.snippetId);
                    break;
                case 'searchSnippets':
                    const results = this.snippetManager.searchSnippets(message.query);
                    this._view?.webview.postMessage({
                        command: 'searchResults',
                        snippets: results
                    });
                    break;
                case 'exportSnippets':
                    try {
                        const filePath = await this.snippetManager.exportSnippets(message.snippetIds);
                        vscode.window.showInformationMessage(`Snippets exported to ${filePath}`);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error exporting snippets: ${error}`);
                    }
                    break;
                case 'importSnippets':
                    try {
                        const count = await this.snippetManager.importSnippets();
                        vscode.window.showInformationMessage(`Imported ${count} snippets`);
                        // Refresh the view with new snippets
                        this._view?.webview.postMessage({
                            command: 'snippets',
                            snippets: this.snippetManager.getAllSnippets()
                        });
                    } catch (error) {
                        vscode.window.showErrorMessage(`Error importing snippets: ${error}`);
                    }
                    break;
            }
        });
    }

    /**
     * Insert a snippet into the active editor
     */
    private async insertSnippet(snippetId: string) {
        const snippet = this.snippetManager.getSnippet(snippetId);
        if (!snippet) {
            vscode.window.showErrorMessage('Snippet not found');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        // Insert the snippet code at cursor position
        await editor.edit(editBuilder => {
            const position = editor.selection.active;
            editBuilder.insert(position, snippet.code);
        });

        vscode.window.showInformationMessage(`Inserted snippet: ${snippet.name}`);
    }

    /**
     * Create a new snippet from the current selection
     */
    private async createSnippetFromSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('No text selected');
            return;
        }

        const code = editor.document.getText(selection);

        // Prompt user for snippet details
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the snippet',
            placeHolder: 'My Snippet'
        });

        if (!name) {
            return; // User cancelled
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description for the snippet',
            placeHolder: 'Description'
        });

        if (description === undefined) {
            return; // User cancelled
        }

        const tagsInput = await vscode.window.showInputBox({
            prompt: 'Enter tags (comma separated)',
            placeHolder: 'laravel, eloquent, authentication'
        });

        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

        const categories = ['General', 'Models', 'Controllers', 'Authentication', 'Database', 'API', 'Other'];
        const category = await vscode.window.showQuickPick(categories, {
            placeHolder: 'Select a category'
        });

        if (!category) {
            return; // User cancelled
        }

        // Create the snippet
        const newSnippet = this.snippetManager.saveSnippet({
            name,
            description,
            code,
            tags,
            category
        });

        // Refresh the webview
        this._view?.webview.postMessage({
            command: 'snippets',
            snippets: this.snippetManager.getAllSnippets()
        });

        vscode.window.showInformationMessage(`Snippet "${name}" created`);
    }

    /**
     * Update an existing snippet
     */
    private updateSnippet(snippet: CodeSnippet) {
        const updated = this.snippetManager.updateSnippet(snippet.id, {
            name: snippet.name,
            description: snippet.description,
            code: snippet.code,
            tags: snippet.tags,
            category: snippet.category
        });

        if (updated) {
            // Refresh the webview
            this._view?.webview.postMessage({
                command: 'snippets',
                snippets: this.snippetManager.getAllSnippets()
            });

            vscode.window.showInformationMessage(`Snippet "${snippet.name}" updated`);
        } else {
            vscode.window.showErrorMessage(`Snippet "${snippet.id}" not found`);
        }
    }

    /**
     * Delete a snippet
     */
    private deleteSnippet(snippetId: string) {
        const snippet = this.snippetManager.getSnippet(snippetId);
        if (!snippet) {
            vscode.window.showErrorMessage('Snippet not found');
            return;
        }

        const deleted = this.snippetManager.deleteSnippet(snippetId);

        if (deleted) {
            // Refresh the webview
            this._view?.webview.postMessage({
                command: 'snippets',
                snippets: this.snippetManager.getAllSnippets()
            });

            vscode.window.showInformationMessage(`Snippet "${snippet.name}" deleted`);
        } else {
            vscode.window.showErrorMessage(`Failed to delete snippet "${snippet.name}"`);
        }
    }

    /**
     * Generate the HTML for the webview
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the local path to main script and css
        const scriptPath = path.join(this.context.extensionPath, 'media', 'snippets.js');
        const stylePath = path.join(this.context.extensionPath, 'media', 'snippets.css');

        // Create URIs for scripts and styles
        let scriptUri: vscode.Uri | string = '';
        let styleUri: vscode.Uri | string = '';

        try {
            scriptUri = webview.asWebviewUri(vscode.Uri.file(scriptPath));
            styleUri = webview.asWebviewUri(vscode.Uri.file(stylePath));
        } catch (error) {
            // If files don't exist yet, use empty values
            console.error('Error loading webview resources:', error);
        }

        // Return HTML content
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Laravel Tinker Snippets</title>
                ${styleUri ? `<link rel="stylesheet" href="${styleUri}">` : ''}
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 0;
                        margin: 0;
                    }
                    .container {
                        padding: 20px;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .search-container {
                        margin-bottom: 15px;
                    }
                    #search-input {
                        width: 100%;
                        padding: 5px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        cursor: pointer;
                        margin-right: 5px;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .snippet-list {
                        overflow-y: auto;
                        height: calc(100vh - 150px);
                    }
                    .snippet-item {
                        border: 1px solid var(--vscode-panel-border);
                        margin-bottom: 10px;
                        padding: 10px;
                    }
                    .snippet-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
                    .snippet-title {
                        font-weight: bold;
                    }
                    .snippet-description {
                        margin-bottom: 5px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .snippet-meta {
                        font-size: 0.8em;
                        color: var(--vscode-descriptionForeground);
                    }
                    .snippet-actions {
                        display: flex;
                        justify-content: flex-end;
                        margin-top: 10px;
                    }
                    .tag {
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 5px;
                        margin-right: 5px;
                        font-size: 0.8em;
                        border-radius: 3px;
                    }
                    .empty-state {
                        text-align: center;
                        padding: 50px 0;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Laravel Snippet Library</h2>
                        <div>
                            <button class="button" id="create-btn">New Snippet</button>
                            <button class="button" id="import-btn">Import</button>
                            <button class="button" id="export-btn">Export</button>
                        </div>
                    </div>
                    
                    <div class="search-container">
                        <input type="text" id="search-input" placeholder="Search snippets...">
                    </div>
                    
                    <div class="snippet-list" id="snippet-list">
                        <div class="empty-state">
                            <p>No snippets found</p>
                            <p>Create a new snippet or import existing ones</p>
                        </div>
                    </div>
                </div>
                
                ${scriptUri ? `<script src="${scriptUri}"></script>` : `
                <script>
                    (function() {
                        // Initialize snippets
                        let snippets = [];
                        const vscode = acquireVsCodeApi();
                        
                        // Request snippets from extension
                        vscode.postMessage({ command: 'getSnippets' });
                        
                        // Handle messages from the extension
                        window.addEventListener('message', event => {
                            const message = event.data;
                            
                            switch (message.command) {
                                case 'snippets':
                                    snippets = message.snippets;
                                    renderSnippets(snippets);
                                    break;
                                case 'searchResults':
                                    renderSnippets(message.snippets);
                                    break;
                            }
                        });
                        
                        // DOM Elements
                        const snippetList = document.getElementById('snippet-list');
                        const searchInput = document.getElementById('search-input');
                        const createBtn = document.getElementById('create-btn');
                        const importBtn = document.getElementById('import-btn');
                        const exportBtn = document.getElementById('export-btn');
                        
                        // Event Listeners
                        createBtn.addEventListener('click', () => {
                            vscode.postMessage({ command: 'createSnippet' });
                        });
                        
                        importBtn.addEventListener('click', () => {
                            vscode.postMessage({ command: 'importSnippets' });
                        });
                        
                        exportBtn.addEventListener('click', () => {
                            vscode.postMessage({ 
                                command: 'exportSnippets',
                                snippetIds: snippets.map(s => s.id)
                            });
                        });
                        
                        searchInput.addEventListener('input', () => {
                            const query = searchInput.value;
                            if (query.trim() === '') {
                                renderSnippets(snippets);
                            } else {
                                vscode.postMessage({ 
                                    command: 'searchSnippets',
                                    query
                                });
                            }
                        });
                        
                        // Render snippets function
                        function renderSnippets(snippetsToRender) {
                            if (!snippetsToRender || snippetsToRender.length === 0) {
                                snippetList.innerHTML = \`
                                    <div class="empty-state">
                                        <p>No snippets found</p>
                                        <p>Create a new snippet or import existing ones</p>
                                    </div>
                                \`;
                                return;
                            }
                            
                            // Group snippets by category
                            const categories = {};
                            snippetsToRender.forEach(snippet => {
                                if (!categories[snippet.category]) {
                                    categories[snippet.category] = [];
                                }
                                categories[snippet.category].push(snippet);
                            });
                            
                            let html = '';
                            
                            // Render each category and its snippets
                            Object.keys(categories).sort().forEach(category => {
                                html += \`<h3>\${category}</h3>\`;
                                
                                categories[category].forEach(snippet => {
                                    const tags = snippet.tags.map(tag => \`<span class="tag">\${tag}</span>\`).join('');
                                    
                                    html += \`
                                        <div class="snippet-item" data-id="\${snippet.id}">
                                            <div class="snippet-header">
                                                <div class="snippet-title">\${snippet.name}</div>
                                            </div>
                                            <div class="snippet-description">\${snippet.description}</div>
                                            <div class="snippet-meta">
                                                \${tags}
                                            </div>
                                            <div class="snippet-actions">
                                                <button class="button insert-btn" data-id="\${snippet.id}">Insert</button>
                                                <button class="button delete-btn" data-id="\${snippet.id}">Delete</button>
                                            </div>
                                        </div>
                                    \`;
                                });
                            });
                            
                            snippetList.innerHTML = html;
                            
                            // Add event listeners to buttons
                            document.querySelectorAll('.insert-btn').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    const snippetId = e.target.dataset.id;
                                    vscode.postMessage({ 
                                        command: 'insertSnippet', 
                                        snippetId 
                                    });
                                });
                            });
                            
                            document.querySelectorAll('.delete-btn').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    const snippetId = e.target.dataset.id;
                                    vscode.postMessage({ 
                                        command: 'deleteSnippet', 
                                        snippetId 
                                    });
                                });
                            });
                        }
                    }())
                </script>
                `}
            </body>
            </html>
        `;
    }
}
