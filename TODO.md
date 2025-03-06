# Laravel Tinker Notebook - TODO List

This document outlines pending tasks, improvements, and features for the Laravel Tinker Notebook extension.

## Features to Implement


## UI/UX Improvements


## Performance Improvements


## Testing Improvements

- [ ] **Test Evidence Capture**
  - [ ] Implement a mechanism to capture screenshots during integration tests
  - [ ] Add a new npm script `test:evidence` that runs tests with visual evidence capture
  - [ ] Create a storage system for organizing test evidence by test name and step
  - [ ] Optimize for macOS using AppleScript for automation

## Documentation


## Manual Documentation Guide

If the automation script doesn't work as expected, follow this manual guide to capture the necessary documentation.

### Setup

1. Install VS Code if not already installed
2. Clone the Laravel Tinker Notebook repository
3. Open the repository in VS Code
4. Install the extension in development mode (`F5`)

### Screenshots to Capture

#### 1. Main Interface with Code Blocks

- **Preparation**:
  - Open `examples/basic-usage.tinker`
  - Position cursor in the first code block
  - Execute the code block with `Ctrl+Enter`
- **Capture**: Take a screenshot showing the code block and its execution result

#### 2. Session Management

- **Preparation**:
  - Open `examples/sessions.tinker`
  - Execute the first block with `Ctrl+Enter`
  - Execute the second block that references variables from the first block
- **Capture**: Take a screenshot showing the session indicator and variable persistence

#### 3. New Session Creation

- **Preparation**:
  - In the same file, find a block with `@tinker-new-session` directive
  - Execute this block
- **Capture**: Take a screenshot showing the new session being created

#### 4. Snippet Library

- **Preparation**:
  - Press `F1` to open the command palette
  - Type `Laravel Tinker Open Snippet` and press Enter
- **Capture**: Take a screenshot of the snippet library interface

#### 5. Different Output Formats

- **Preparation**:
  - Open `examples/output-formats.tinker`
  - Execute blocks showing different output formats (JSON, table, raw)
- **Capture**: Take separate screenshots for each output format

#### 6. Error Handling

- **Preparation**:
  - Open `examples/error-handling.tinker`
  - Execute a block with intentional errors
- **Capture**: Take a screenshot showing the error visualization

#### 7. Special Directives

- **Preparation**:
  - Open `examples/directives.tinker`
  - Find blocks with special directives (`@tinker-hide-result`, `@tinker-show-raw`)
  - Execute these blocks
- **Capture**: Take screenshots showing the effect of each directive

#### 8. Process Pool

- **Preparation**:
  - Press `F1` to open the command palette
  - Type `Laravel Tinker Show Process Pool` and press Enter
- **Capture**: Take a screenshot of the process pool interface

### GIFs/Videos to Create

#### 1. Creating and Executing Code Blocks

- Record a short GIF showing:
  - Creating a new `.tinker` file
  - Adding a PHP code block
  - Executing the code with `Ctrl+Enter`
  - Viewing the results

#### 2. Managing Sessions

- Record a GIF showing:
  - Executing a block that defines variables
  - Executing another block that uses those variables
  - Creating a new session with the directive
  - Showing that variables from the previous session are not available

#### 3. Using the Snippet Library

- Record a GIF showing:
  - Opening the snippet library
  - Browsing available snippets
  - Inserting a snippet into a document
  - Executing the inserted snippet

#### 4. Working with Special Directives

- Record a GIF showing the effect of different directives

### Recommended Tools

- **Screenshots**: Use built-in macOS screenshot tool (`Cmd+Shift+4`)
- **GIFs**: Use LICEcap, Kap, or ScreenToGif
- **Videos**: Use QuickTime Player's screen recording feature

### File Organization

- Save all media files in the `docs/images/` directory
- Use descriptive filenames following the pattern:
  - Screenshots: `feature-name.png`
  - GIFs: `feature-name.gif`
  - Videos: `feature-name.mp4`
