# Contributing to Laravel Tinker Notebook

Thank you for your interest in contributing to Laravel Tinker Notebook! This document provides information on how to set up the development environment and how to run tests.

## Architecture

Laravel Tinker Notebook is a VS Code extension that allows you to execute PHP/Laravel code directly from the editor, displaying the results inline. To understand the project architecture, check out [docs/architecture.md](docs/architecture.md).

## Setting up the development environment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/laravel-tinker-notebook.git
   cd laravel-tinker-notebook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. To run the extension in development mode, press F5 in VS Code to launch a new window with the extension loaded.

## Project structure

```
laravel-tinker-notebook/
├── src/                    # Extension source code
│   ├── editor/             # Components related to editing
│   ├── execution/          # Services for executing code with Tinker
│   ├── output/             # Processing Tinker output
│   └── utils/              # General utilities
├── test/                   # Tests
│   ├── unit/               # Unit tests (Jest)
│   │   ├── editor/         # Tests for editor components
│   │   └── execution/      # Tests for execution services
│   └── integration/        # Integration tests (VS Code)
├── docs/                   # Documentation
└── dist/                   # Compiled code (generated)
```

## Testing

The project uses two types of tests:

### Unit tests

Unit tests use Jest and are located in the `test/unit/` directory. These tests verify individual components without needing to start VS Code.

To run unit tests:

```bash
npm run test
```

To run unit tests in watch mode (useful during development):

```bash
npm run test:watch
```

### Integration tests

Integration tests run the extension in a real VS Code environment using `@vscode/test-electron`. These tests are located in the `test/integration/` directory.

To run integration tests:

```bash
npm run test:integration
```

### Running all tests

To run both unit and integration tests:

```bash
npm run test:all
```

## Mocking the vscode module

For unit tests, we need to simulate the `vscode` module which is normally only available within the VS Code environment. We use a custom mock in `test/mocks/vscode.ts`.

## Tips for developers

1. **Unit tests vs. integration**: 
   - Use unit tests for isolated components and business logic.
   - Use integration tests to verify that the extension works correctly in a real VS Code environment.

2. **Debugging**:
   - To debug the extension, start a debugging session in VS Code (F5).
   - To debug tests, you can use the `Debug Tests` command in VS Code.

3. **Commit structure**:
   - Use descriptive commit messages that explain what changes have been made.
   - Each commit should address a single issue or feature.

## Contribution process

1. Create a branch for your feature or fix.
2. Implement your changes.
3. Make sure all tests pass.
4. Submit a pull request with a clear description of the changes.

## Code guidelines

- Follow TypeScript style conventions.
- Document functions and classes with JSDoc comments.
- Maintain a high percentage of test coverage.
- Use descriptive names for variables, functions, and classes.

Thank you for contributing to Laravel Tinker Notebook!
