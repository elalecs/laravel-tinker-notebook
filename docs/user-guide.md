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
