# Contributing to Mummy

First off, thank you for considering contributing to Mummy! 🎉

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Logs or screenshots** if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear use case**
- **Expected behavior**
- **Why this enhancement would be useful**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the existing code style**
3. **Add tests** if applicable
4. **Update documentation** as needed
5. **Ensure tests pass**
6. **Write a clear commit message**

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/mummy.git
cd mummy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials

# Start development server
npm run dev
```

## Code Style

- Use TypeScript
- Follow existing patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

## Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests

Examples:
```
feat: Add medication reminder scheduling
fix: Handle empty PDF documents
docs: Update installation instructions
refactor: Extract Claude service into separate file
```

## Project Structure

```
mummy/
├── src/
│   ├── config/          # Configuration
│   ├── handlers/        # Message handlers
│   ├── models/          # Database models
│   ├── services/        # External services
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── tests/               # Test files
└── docs/                # Documentation
```

## Questions?

Feel free to open an issue for any questions!

Thank you! ❤️
