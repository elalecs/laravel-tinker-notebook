# Laravel Tinker Notebook: Architecture Document

## Overview

Laravel Tinker Notebook is a VSCodeium extension that enables developers to write, save, and execute PHP/Laravel code snippets directly within the editor, displaying results inline. It functions similarly to Jupyter notebooks but is specifically designed for PHP/Laravel development, leveraging Laravel's Tinker REPL.

## Core Features

1. **Interactive Code Execution**: Run PHP/Laravel code directly from the editor
2. **Result Display**: View execution results in a separate editor panel
3. **Notebook-style Interface**: Mix documentation with executable code using Markdown
4. **Session Management**: Maintain state between code executions

## Technical Architecture

### 1. File Format Support

The extension supports two main file formats:

#### Markdown-Based Notebooks (Primary Format)
- Files with `.md` or `.tinker.md` extension
- Standard Markdown format with special handling for PHP code blocks
- Code blocks starting with \`\`\`php or \`\`\`tinker will be treated as executable
- Special directives available via HTML comments or custom syntax within code blocks

#### Dedicated Snippet Files (Secondary Format)
- Files with `.tinker` or `.laravel-snippet` extension
- Entire file treated as PHP code
- Special comment directives for execution control and documentation

### 2. Extension Components

#### 2.1 Editor Enhancement

**Code Decoration Provider**
- Adds "Run on Tinker" button above executable code blocks
- Provides syntax highlighting for PHP code
- Renders results after code blocks when executed

**Document Parser**
- Parses Markdown files to identify executable code blocks
- Extracts directives and special commands
- Manages code block dependencies and execution order

#### 2.2 Execution Engine

**Tinker Process Manager**
- Manages communication with PHP Artisan Tinker
- Supports both execution modes:
  - `php artisan tinker --execute` for single commands
  - `cat /tmp/file | php artisan tinker -` for multi-line scripts
- Handles process lifecycle and resource cleanup
