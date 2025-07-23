# BIM/IDS Validation Tool
**🚧WIP - WORK IN PROGRESS🚧**

A fully client-side web application for validating Building Information Modeling (BIM) data from IFC files against Information Delivery Specification (IDS) requirements.

## 🎯 What This App Does

- **Load and visualize IFC files** in an interactive 3D viewer
- **Validate against IDS specifications** with real-time feedback
- **Highlight validation results** directly in the 3D model
- **Zero data upload** - all processing happens in your browser
- **Instantaneous feedback** - no server round-trips required

Built for BIM professionals, construction teams, and anyone needing IFC validation without compromising data privacy.

## ✨ Key Features

- **Client-Side Processing**: Heavy computation via WebAssembly (WASM) - your files never leave your computer
- **Real-Time Validation**: Instant feedback as you work with your models
- **Interactive 3D Viewer**: Navigate, measure, and inspect your BIM models
- **Open Source Foundation**: Built exclusively on open-source libraries
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites

You'll need Node.js installed on your system. Choose the method that works best for your platform:

#### Windows

**Option 1: PowerShell (Recommended)**
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Open PowerShell and verify installation:
   ```powershell
   node --version
   npm --version
   ```

**Option 2: WSL (Windows Subsystem for Linux)**
1. Install WSL if you haven't already: `wsl --install`
2. Open your WSL terminal (Ubuntu/Debian)
3. Follow the Linux instructions below

#### macOS

**Option 1: Official Installer**
1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Run the `.pkg` installer

**Option 2: Homebrew (Recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

**Option 3: Node Version Manager (nvm)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install latest Node.js
nvm install node
nvm use node
```

#### Linux

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```

**Using Node Version Manager (nvm) - All Linux Distros:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install latest Node.js
nvm install node
nvm use node
```

### Installation & Running

1. **Clone the repository:**
   ```bash
   git clone https://github.com/vinnividivicci/openingbim-cicd.git
   cd bim-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - The app will be available at `http://localhost:5173`
   - The development server supports hot reloading for instant updates

### Build for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## 🛠️ Technology Stack

- **Frontend**: Vanilla TypeScript with Vite
- **3D Rendering**: Three.js
- **BIM Processing**: @thatopen/components ecosystem
- **IFC Parsing**: web-ifc (WebAssembly)
- **Build Tool**: Vite with TypeScript

## 📁 Project Structure

```
bim-app/
├── src/                    # Main source code
│   ├── main.ts            # Application entry point
│   ├── globals.ts         # Global constants and configuration
│   ├── bim-components/    # Custom BIM-specific components
│   └── ui-templates/      # UI component templates
├── gemini/                # Product specifications and examples
├── index.html             # Main HTML entry point
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🤝 Contributing

This is an open-source project built on open-source foundations. Contributions are welcome!

## 📄 License

GNU GPL v3: https://www.gnu.org/licenses/gpl-3.0.html

## 🆘 Troubleshooting

**Common Issues:**

- **Port already in use**: If port 5173 is busy, Vite will automatically use the next available port
- **Node.js version**: This project requires Node.js 16 or higher
- **WSL users**: Make sure you're running commands inside your WSL environment, not Windows PowerShell

**Need Help?**
- Check the browser console for error messages
- Ensure all dependencies installed correctly with `npm install`
- Try clearing node_modules and reinstalling: `rm -rf node_modules && npm install`

---

**Built with ❤️ for the BIM community**