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
    
    // DOM Elements initialization after page loads
    document.addEventListener('DOMContentLoaded', () => {
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
    });
    
    // Render snippets function
    function renderSnippets(snippetsToRender) {
        const snippetList = document.getElementById('snippet-list');
        
        if (!snippetsToRender || snippetsToRender.length === 0) {
            snippetList.innerHTML = `
                <div class="empty-state">
                    <p>No snippets found</p>
                    <p>Create a new snippet or import existing ones</p>
                </div>
            `;
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
            html += `<h3 class="category-header">${category}</h3>`;
            
            categories[category].forEach(snippet => {
                const tags = snippet.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
                
                html += `
                    <div class="snippet-item" data-id="${snippet.id}">
                        <div class="snippet-header">
                            <div class="snippet-title">${snippet.name}</div>
                        </div>
                        <div class="snippet-description">${snippet.description}</div>
                        <div class="snippet-meta">
                            ${tags}
                        </div>
                        <div class="snippet-actions">
                            <button class="button insert-btn" data-id="${snippet.id}">Insert</button>
                            <button class="button delete-btn" data-id="${snippet.id}">Delete</button>
                        </div>
                    </div>
                `;
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
})();
