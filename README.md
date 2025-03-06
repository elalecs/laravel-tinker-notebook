# Laravel Tinker Notebook

A VSCodeium extension that brings interactive PHP/Laravel code execution directly into your editor. Similar to Jupyter notebooks for Python, this extension allows you to write, document, and execute PHP code within Markdown files, providing immediate feedback without leaving your IDE.

## Features

- Run PHP/Laravel code directly from your editor
- View execution results inline with advanced formatting options
- Maintain state between code executions
- Mix documentation with executable code
- Organize code snippets for reuse
- Export and share execution results in multiple formats

## Getting Started

1. Install the extension
2. Open a Laravel project
3. Create a file with `.tinker.md` extension
4. Write markdown with PHP code blocks
5. Click "Run on Tinker" to execute code blocks

## Requirements

- VSCodeium or VS Code
- PHP 7.4+ installed and in your PATH
- A Laravel project with Tinker installed

## Usage

See [User Guide](./docs/user-guide.md) for detailed usage instructions.

## Result Display Features

### Smart Output Formatting
- **JSON Formatting**: Automatically detects and formats JSON output for better readability
- **Table Formatting**: Displays array data in structured table format
- **PHP var_dump Formatting**: Improves readability of PHP var_dump output

### Interactive Results
- **Collapsible Results**: Toggle between expanded and collapsed views of large results
- **Copy to Clipboard**: Easily copy results with a single click
- **Export Options**: Export results to JSON, CSV, HTML, or plain text formats

## License

This extension is licensed under the MIT License.
