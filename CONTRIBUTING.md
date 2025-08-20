# Contributing to Purro

Thank you for your interest in contributing to Purro! This document provides guidelines and information for contributors.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Chrome browser for testing
- Git

### Fork and Clone
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/purro-extension.git
   cd purro-extension
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/purro-xyz/purro-extension.git
   ```

## Development Setup

### Install Dependencies
```bash
pnpm install
```

### Build the Extension
```bash
# Development build with watch mode
pnpm run build:watch

# Production build
pnpm run build

# Type checking
pnpm run type-check
```

### Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` folder
4. The Purro extension should now appear in your extensions list

## Contribution Guidelines

### What Can You Contribute?
- 🐛 **Bug fixes** - Help identify and fix issues
- ✨ **New features** - Add functionality to the wallet
- 📚 **Documentation** - Improve docs, add examples, fix typos
- 🧪 **Tests** - Add or improve test coverage
- 🎨 **UI/UX improvements** - Enhance the user interface
- 🔧 **Performance optimizations** - Improve speed and efficiency
- 🌐 **Translations** - Help with internationalization

### Before You Start
1. Check existing [issues](https://github.com/purro-xyz/purro-extension/issues) to see if your contribution is already being worked on
2. For new features, create an issue first to discuss the approach
3. For bugs, check if they've already been reported

## Pull Request Process

### Creating a Pull Request
1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

3. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

### Pull Request Guidelines
- **Title**: Use conventional commit format (e.g., "feat: add token search functionality")
- **Description**: Clearly describe what the PR does and why
- **Related Issues**: Link any related issues using keywords like "Fixes #123" or "Closes #456"
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how you tested your changes

### Commit Message Format
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add token search functionality
fix: resolve connection restoration issue
docs: update installation instructions
test: add unit tests for encryption module
```

## Testing

### Run Tests
```bash
# Run all tests
pnpm run test

# Run security tests
pnpm run test:security

# Run encryption tests
pnpm run test:encryption

# Run storage tests
pnpm run test:storage

# Full security audit
pnpm run security:check
```

### Testing Guidelines
- Write tests for new features
- Ensure all tests pass before submitting PR
- Add integration tests for critical functionality
- Test on different Chrome versions if possible

## Code Style

### TypeScript
- Use TypeScript for all new code
- Follow strict type checking
- Use interfaces for object shapes
- Prefer `const` over `let` when possible

### React Components
- Use functional components with hooks
- Follow React best practices
- Use proper prop types and interfaces
- Keep components focused and reusable

### File Organization
```
src/
├── background/          # Background scripts
├── client/             # React UI components
├── assets/             # Static assets
└── types/              # Type definitions
```

### Naming Conventions
- **Files**: kebab-case (e.g., `account-handler.ts`)
- **Components**: PascalCase (e.g., `AccountSheet.tsx`)
- **Functions**: camelCase (e.g., `handleAccountSwitch`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

## Reporting Issues

### Bug Reports
When reporting bugs, please include:
- **Description**: Clear description of the issue
- **Steps to reproduce**: Detailed steps to reproduce the bug
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: Browser version, OS, extension version
- **Screenshots**: If applicable
- **Console logs**: Any error messages from browser console

### Issue Template
```markdown
## Bug Description
[Clear description of the issue]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: [Chrome version]
- OS: [Operating system]
- Extension Version: [Purro version]

## Additional Information
[Screenshots, logs, etc.]
```

## Feature Requests

### Before Submitting
1. Check if the feature is already planned
2. Search existing issues for similar requests
3. Consider if the feature aligns with Purro's goals

### Feature Request Template
```markdown
## Feature Description
[Clear description of the feature]

## Use Case
[Why this feature would be useful]

## Proposed Implementation
[Optional: How you think it could be implemented]

## Alternatives Considered
[Optional: Other approaches you considered]
```

## Community

### Communication Channels
- **Discord**: [Join our community](https://discord.gg/VJunuK9T5w)
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For general questions and discussions

### Getting Help
- Check the [documentation](https://docs.purro.xyz)
- Search existing issues and discussions
- Ask questions in Discord or GitHub Discussions
- Create an issue if you find a bug

### Recognition
Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Project documentation

## License

By contributing to Purro, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](LICENSE) for details.

## Questions?

If you have questions about contributing, feel free to:
- Ask in our [Discord community](https://discord.gg/VJunuK9T5w)
- Create a GitHub Discussion
- Contact us at thaiphamngoctuong@gmail.com

Thank you for contributing to Purro! 🐱 