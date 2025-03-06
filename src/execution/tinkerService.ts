import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { ExecutionResult } from '../editor/resultRenderer';

export interface ExecutionOptions {
    newSession: boolean;
    showRaw: boolean;
    hideResult: boolean;
    sessionId?: string; // Optional: allows specifying a specific session
}

export interface TinkerSession {
    id: string;
    name: string;
    createdAt: Date;
    lastUsed: Date;
    variables: string[]; // Variables available in this session
    projectRoot: string;
    isActive: boolean;
}

export class TinkerExecutionService extends EventEmitter {
    private sessions: Map<string, TinkerSession> = new Map();
    private currentSessionId: string | null = null;
    private sessionVariablesDir: string;
    
    constructor() {
        super();
        // Create temporary directory to store session variables
        this.sessionVariablesDir = path.join(os.tmpdir(), 'laravel-tinker-sessions');
        if (!fs.existsSync(this.sessionVariablesDir)) {
            fs.mkdirSync(this.sessionVariablesDir, { recursive: true });
        }
    }
    
    /**
     * Executes code in a Tinker session and maintains state between executions
     */
    public async executeCode(code: string, options: ExecutionOptions): Promise<ExecutionResult> {
        try {
            // Find Laravel project root directory
            const projectRoot = await this.findLaravelProjectRoot();
            if (!projectRoot) {
                throw new Error('Laravel project not found. Make sure you are in a Laravel project directory.');
            }
            
            // Determine which session to use
            let sessionId = options.sessionId || this.currentSessionId;
            
            // Create a new session if needed
            if (options.newSession || !sessionId || !this.sessions.has(sessionId)) {
                sessionId = await this.createNewSession(projectRoot);
            }
            
            // Set the current session
            this.currentSessionId = sessionId;
            
            // Get the current session
            const session = this.sessions.get(sessionId)!;
            session.lastUsed = new Date();
            
            // Create a modified version of the code to capture defined variables
            const enhancedCode = this.enhanceCodeForVariableTracking(code, sessionId);
            
            // Create a temporary file for the code
            const tempFile = await this.createTempCodeFile(enhancedCode);
            
            // Prepare the session file to maintain variables
            const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
            
            // Prepare the command to execute
            let command: string;
            if (fs.existsSync(sessionFile)) {
                // If a session file exists, load the variables before executing the code
                command = `cd "${projectRoot}" && (echo "require '${sessionFile}';" && cat "${tempFile}") | php artisan tinker -`;
            } else {
                // If there is no session file, execute the code directly
                command = `cd "${projectRoot}" && cat "${tempFile}" | php artisan tinker -`;
            }
            
            // Execute the command
            const output = await this.executeCommand(command);
            
            // Update the session's variable list
            await this.updateSessionVariables(sessionId);
            
            // Notify session state change
            this.emit('session-updated', session);
            
            // Clean up the temporary file
            fs.unlinkSync(tempFile);
            
            return {
                output: output.trim(),
                isRaw: options.showRaw,
                sessionId: sessionId,
                sessionActive: true
            };
            
        } catch (error) {
            return {
                output: '',
                error: error instanceof Error ? error.message : String(error),
                isRaw: options.showRaw,
                sessionId: this.currentSessionId,
                sessionActive: !!this.currentSessionId
            };
        }
    }
    
    /**
     * Creates a new Tinker session
     */
    private async createNewSession(projectRoot: string): Promise<string> {
        const sessionId = `session-${Date.now()}`;
        const session: TinkerSession = {
            id: sessionId,
            name: `Session ${new Date().toLocaleTimeString()}`,
            createdAt: new Date(),
            lastUsed: new Date(),
            variables: [],
            projectRoot: projectRoot,
            isActive: true
        };
        
        this.sessions.set(sessionId, session);
        this.emit('session-created', session);
        return sessionId;
    }
    
    /**
     * Adds code to track variables defined in the session
     */
    private enhanceCodeForVariableTracking(code: string, sessionId: string): string {
        const outputFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
        const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
        
        // Code that will be added at the end to export defined variables
        const trackerCode = `
// Code to track variables
$definedVars = get_defined_vars();
$sessionVars = [];
foreach ($definedVars as $key => $value) {
    if ($key !== 'definedVars' && $key !== 'sessionVars' && $key !== 'key' && $key !== 'value') {
        $sessionVars[$key] = serialize($value);
    }
}
file_put_contents('${outputFile}', json_encode($sessionVars));

// Create PHP code to restore variables in the next execution
$phpCode = "<?php\n";
foreach ($sessionVars as $key => $serialized) {
    $phpCode .= "\$$key = unserialize(\"" . addcslashes($serialized, '"\\') . "\");\n";
}
file_put_contents('${sessionFile}', $phpCode);
`;
        
        return code + trackerCode;
    }
    
    /**
     * Updates the list of variables available in the session
     */
    private async updateSessionVariables(sessionId: string): Promise<void> {
        const variablesFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
        
        if (fs.existsSync(variablesFile)) {
            try {
                const variablesJson = fs.readFileSync(variablesFile, 'utf8');
                const variables = Object.keys(JSON.parse(variablesJson));
                
                const session = this.sessions.get(sessionId);
                if (session) {
                    session.variables = variables;
                    this.emit('variables-updated', { sessionId, variables });
                }
            } catch (error) {
                console.error('Error updating session variables:', error);
            }
        }
    }
    
    /**
     * Gets all active sessions
     */
    public getSessions(): TinkerSession[] {
        return Array.from(this.sessions.values());
    }
    
    /**
     * Gets the current session
     */
    public getCurrentSession(): TinkerSession | null {
        return this.currentSessionId ? this.sessions.get(this.currentSessionId) || null : null;
    }
    
    /**
     * Cambia a una sesión existente
     */
    public switchToSession(sessionId: string): boolean {
        if (this.sessions.has(sessionId)) {
            this.currentSessionId = sessionId;
            const session = this.sessions.get(sessionId)!;
            session.lastUsed = new Date();
            this.emit('session-switched', session);
            return true;
        }
        return false;
    }
    
    /**
     * Cierra una sesión y elimina sus archivos asociados
     */
    public closeSession(sessionId: string): boolean {
        if (this.sessions.has(sessionId)) {
            // Eliminar archivos de la sesión
            const sessionFile = path.join(this.sessionVariablesDir, `${sessionId}.php`);
            const variablesFile = path.join(this.sessionVariablesDir, `${sessionId}-vars.json`);
            
            if (fs.existsSync(sessionFile)) {
                fs.unlinkSync(sessionFile);
            }
            
            if (fs.existsSync(variablesFile)) {
                fs.unlinkSync(variablesFile);
            }
            
            // Eliminar la sesión del mapa
            this.sessions.delete(sessionId);
            
            // Si era la sesión actual, borrar la referencia
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
            }
            
            this.emit('session-closed', sessionId);
            return true;
        }
        return false;
    }
    
    private async findLaravelProjectRoot(): Promise<string | undefined> {
        // Start with the workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }
        
        // Check each workspace folder for an artisan file
        for (const folder of workspaceFolders) {
            const artisanPath = path.join(folder.uri.fsPath, 'artisan');
            if (fs.existsSync(artisanPath)) {
                return folder.uri.fsPath;
            }
        }
        
        // If no artisan file found directly in workspace folders,
        // try to find it in subdirectories (but only go one level deep)
        for (const folder of workspaceFolders) {
            const entries = fs.readdirSync(folder.uri.fsPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const artisanPath = path.join(folder.uri.fsPath, entry.name, 'artisan');
                    if (fs.existsSync(artisanPath)) {
                        return path.join(folder.uri.fsPath, entry.name);
                    }
                }
            }
        }
        
        return undefined;
    }
    
    private async createTempCodeFile(code: string): Promise<string> {
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `laravel-tinker-${Date.now()}.php`);
        
        fs.writeFileSync(tempFile, code);
        return tempFile;
    }
    
    private executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                    return;
                }
                resolve(stdout);
            });
        });
    }
}
