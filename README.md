# Secure Electron App

A secure, modern Electron desktop application with enterprise authentication, built using React, TypeScript, Electron Forge, and Playwright.

## Features
- **Enterprise Authentication**: OIDC login flow with Auth0 integration
- **Secure Token Storage**: Uses native OS keychain for storing tokens
- **Modern UI**: Built with React and CSS, easily customizable
- **Automated Testing**: Playwright tests for authentication and UI
- **Security Best Practices**: Content Security Policy, native module handling
- **Cross-platform**: Works on Windows, macOS, and Linux

## Screenshots
![Login Screen](screenshots/login.png)
![Welcome Screen](screenshots/welcome.png)

## Getting Started

### Prerequisites
- Node.js >= 18
- npm

### Installation
```bash
npm install
```

### Running the App
```bash
npm start
```

### Running Tests
```bash
npm test
```

## Project Structure
- `src/` - Main and renderer process code
- `tests/` - Playwright test scripts
- `webpack.*.ts` - Webpack configuration files
- `forge.config.ts` - Electron Forge configuration

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author
Muhammad Imran ([imranbwpk@gmail.com](mailto:imranbwpk@gmail.com))

---

> Professional, secure, and ready for enterprise deployment. For more info or custom solutions, contact the author.
