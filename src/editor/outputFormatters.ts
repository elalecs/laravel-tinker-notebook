import * as vscode from 'vscode';

/**
 * Interface for output formatters
 */
export interface OutputFormatter {
    /**
     * Check if the formatter can format the given output
     */
    canFormat(output: string): boolean;
    
    /**
     * Format the output
     */
    format(output: string): string;
    
    /**
     * Get the language ID for syntax highlighting
     */
    getLanguageId(): string;
}

/**
 * JSON formatter for object outputs
 */
export class JsonFormatter implements OutputFormatter {
    canFormat(output: string): boolean {
        // Try to detect if the output is JSON
        try {
            // Check if the output starts with { or [ after trimming
            const trimmed = output.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                // Try to parse it as JSON
                JSON.parse(trimmed);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
    
    format(output: string): string {
        try {
            const trimmed = output.trim();
            const parsed = JSON.parse(trimmed);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            // If we can't parse it, return the original
            return output;
        }
    }
    
    getLanguageId(): string {
        return 'json';
    }
}

/**
 * Table formatter for array data
 */
export class TableFormatter implements OutputFormatter {
    canFormat(output: string): boolean {
        try {
            // Check if the output starts with [ after trimming
            const trimmed = output.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                // Try to parse it as JSON
                const parsed = JSON.parse(trimmed);
                // Check if it's an array of objects with the same keys
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                    // Check if all objects have the same keys
                    const firstKeys = Object.keys(parsed[0]).sort().join(',');
                    return parsed.every(item => 
                        typeof item === 'object' && 
                        Object.keys(item).sort().join(',') === firstKeys
                    );
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }
    
    format(output: string): string {
        try {
            const trimmed = output.trim();
            const parsed = JSON.parse(trimmed);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
                return output;
            }
            
            // Get the headers from the first object
            const headers = Object.keys(parsed[0]);
            
            // Calculate the max width for each column
            const columnWidths = headers.map(header => header.length);
            
            // Update column widths based on data
            parsed.forEach(row => {
                headers.forEach((header, index) => {
                    const value = String(row[header] ?? '');
                    columnWidths[index] = Math.max(columnWidths[index], value.length);
                });
            });
            
            // Build the table
            let table = '';
            
            // Add the header row
            table += '| ';
            headers.forEach((header, index) => {
                table += header.padEnd(columnWidths[index]) + ' | ';
            });
            table += '\n';
            
            // Add the separator row
            table += '| ';
            headers.forEach((_, index) => {
                table += '-'.repeat(columnWidths[index]) + ' | ';
            });
            table += '\n';
            
            // Add the data rows
            parsed.forEach(row => {
                table += '| ';
                headers.forEach((header, index) => {
                    const value = String(row[header] ?? '');
                    table += value.padEnd(columnWidths[index]) + ' | ';
                });
                table += '\n';
            });
            
            return table;
        } catch (e) {
            // If we can't parse it, return the original
            return output;
        }
    }
    
    getLanguageId(): string {
        return 'markdown';
    }
}

/**
 * PHP var_dump formatter
 */
export class PhpVarDumpFormatter implements OutputFormatter {
    canFormat(output: string): boolean {
        // Check if the output looks like a PHP var_dump
        return output.includes('array(') || 
               output.includes('object(') || 
               output.includes('=> ');
    }
    
    format(output: string): string {
        // Simple formatting for PHP var_dump output
        // Replace => with proper indentation
        let formatted = output;
        
        // Add line breaks after closing brackets
        formatted = formatted.replace(/\)/g, ')\n');
        
        // Add indentation for array items
        const lines = formatted.split('\n');
        let indentLevel = 0;
        
        formatted = lines.map(line => {
            // Decrease indent level for closing brackets
            if (line.includes('}') || line.includes(')')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            const indented = ' '.repeat(indentLevel * 2) + line;
            
            // Increase indent level for opening brackets
            if (line.includes('{') || line.includes('(') && !line.includes(')')) {
                indentLevel++;
            }
            
            return indented;
        }).join('\n');
        
        return formatted;
    }
    
    getLanguageId(): string {
        return 'php';
    }
}

/**
 * Plain text formatter (default)
 */
export class PlainTextFormatter implements OutputFormatter {
    canFormat(output: string): boolean {
        // This is the default formatter, it can format anything
        return true;
    }
    
    format(output: string): string {
        return output;
    }
    
    getLanguageId(): string {
        return 'plaintext';
    }
}

/**
 * Factory for creating formatters
 */
export class OutputFormatterFactory {
    private formatters: OutputFormatter[];
    
    constructor() {
        this.formatters = [
            new JsonFormatter(),
            new TableFormatter(),
            new PhpVarDumpFormatter(),
            new PlainTextFormatter() // Default formatter, should be last
        ];
    }
    
    /**
     * Get the best formatter for the given output
     */
    getFormatter(output: string): OutputFormatter {
        for (const formatter of this.formatters) {
            if (formatter.canFormat(output)) {
                return formatter;
            }
        }
        
        // This should never happen as the PlainTextFormatter can format anything
        return new PlainTextFormatter();
    }
}
