# Laravel Tinker Notebook - User Guide

## Introduction

Laravel Tinker Notebook is a VSCodeium extension that brings interactive PHP/Laravel code execution directly into your editor. Similar to Jupyter notebooks for Python, this extension allows you to write, document, and execute PHP code within Markdown files, providing immediate feedback without leaving your IDE.

## Installation

### Prerequisites

- VSCodeium or VS Code
- PHP 7.4+ installed and in your PATH
- A Laravel project with Tinker installed

### Installing the Extension

1. Open VSCodeium/VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Laravel Tinker Notebook"
4. Click Install

## Getting Started

### Creating Your First Notebook

1. Open a Laravel project in VSCodeium
2. Create a new file with a `.tinker.md` or `.md` extension (e.g., `examples.tinker.md`)
3. Add some markdown content and PHP code blocks

## Features

### Code Block Types

The extension supports two types of code blocks:

1. **PHP Code Blocks**: Standard PHP code that will be executed in Tinker
   ```php
   $users = App\Models\User::all();
   $users;
   ```

2. **Tinker-specific Blocks**: Specifically marked for Tinker execution
   ```tinker
   $users = App\Models\User::all();
   $users;
   ```

### Directives

You can add special directives to your code blocks to control execution behavior:

- `// @tinker-new-session`: Start a fresh Tinker session for this block
- `// @tinker-continue`: Continue from the previous block (default behavior)
- `// @tinker-show-raw`: Display raw output without formatting
- `// @tinker-hide-result`: Execute but don't display results

## Result Display Features

### Smart Output Formatting

The extension automatically detects and formats different types of output:

#### JSON Formatting

When your code returns JSON data, it's automatically formatted for better readability:

```php
$data = ['name' => 'John', 'age' => 30, 'skills' => ['PHP', 'Laravel', 'Vue']];
return json_encode($data);
```

The output will be formatted as properly indented JSON.

#### Table Formatting

When your code returns an array of objects or associative arrays, it's displayed as a table:

```php
$users = App\Models\User::take(5)->get();
return $users;
```

The output will be formatted as a table with columns for each property.

#### PHP var_dump Formatting

When using `var_dump()`, the output is formatted for better readability:

```php
$user = App\Models\User::first();
var_dump($user);
```

### Interactive Results

#### Collapsible Results

For large results, you can toggle between expanded and collapsed views:

1. Hover over any result to see the full content
2. Click the **[Colapsar/Expandir]** button to toggle the view
3. Collapsed results show a summary, while expanded results show the full content

#### Copy and Export

Easily copy or export your results:

1. **Copy to Clipboard**: Click the **[Copiar]** button in the hover message or use the command `Laravel Tinker: Copy Result to Clipboard`

2. **Export Results**: Click the **[Exportar]** button in the hover message or use the command `Laravel Tinker: Export Result`

#### Export Formats

When exporting results, you can choose from several formats:

- **JSON**: Structured data in JSON format
- **CSV**: Comma-separated values for tabular data
- **HTML**: Formatted HTML output with styling
- **Plain Text**: Raw text output
