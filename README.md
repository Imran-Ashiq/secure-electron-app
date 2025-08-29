# Secure Electron App

>A secure, enterprise-ready Electron desktop application with modern authentication, robust security, and a beautiful UI.

---

## 🚀 Features

- **🔒 Enterprise Authentication** — OIDC login flow with Auth0 integration
- **🗝️ Secure Token Storage** — Uses native OS keychain for storing tokens
- **✨ Modern UI** — Built with React and CSS, easily customizable
- **🧪 Automated Testing** — Playwright tests for authentication and UI
- **🛡️ Security Best Practices** — Content Security Policy, native module handling
- **💻 Cross-platform** — Works on Windows, macOS, and Linux

---

## 🎬 Demo

1. **Login:** Users authenticate securely via enterprise OIDC (Auth0)
2. **Token Storage:** Refresh tokens are stored in the OS keychain
3. **User Info:** App displays user details after login
4. **Logout:** Tokens are securely cleared on logout

![Login Screen](screenshots/login.png)
![Welcome Screen](screenshots/welcome.png)

---

## 🛠️ How it Works

- **Electron Forge** powers the desktop app build and packaging
- **React** provides a fast, modern UI
- **Auth0** handles secure authentication and user management
- **Keytar** stores tokens securely in the OS keychain
- **Playwright** ensures reliability with automated UI tests
- **CSP** and native module handling keep your app secure

---

## 🧩 Customization

- Easily update UI styles in `src/index.css`
- Add new authentication providers via Auth0 dashboard
- Extend features with React components in `src/app.tsx`

---

## Getting Started

### Prerequisites
- Node.js >= 18
- npm


### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file in the project root with your Auth0 credentials:
```env
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
```

### Install dotenv (for local environment variable loading)
```bash
npm install dotenv
```

### Running the App
```bash
npm start
```


### Building the Packaged App
Before running tests, build the packaged app to generate the executable in the `out` directory:
```bash
npm run make
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


