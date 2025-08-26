# Technology Stack & Build System

## Core Technologies

### Frontend Framework
- **Vanilla TypeScript/JavaScript** (ES2020+) with strict type checking
- **Vite** as build tool and development server
- **Three.js** for 3D rendering and visualization

### BIM-Specific Libraries
- **@thatopen/components** (~3.1.0) - High-level BIM components and functionality
- **@thatopen/components-front** (~3.1.0) - Frontend-specific BIM components  
- **@thatopen/fragments** (~3.1.0) - Efficient geometry handling engine
- **@thatopen/ui** (~3.1.0) - UI component library
- **@thatopen/ui-obc** (~3.1.0) - OpenBIM Components UI elements
- **web-ifc** (0.0.69) - WebAssembly-powered IFC file parser

### Development Tools
- **TypeScript** (5.2.2) with strict configuration
- **ESLint** with Airbnb base config + Prettier integration
- **Prettier** for code formatting

## Build Commands

### Development
```bash
npm run dev
```
Starts Vite development server with host binding for network access

### Production Build
```bash
npm run build
```
Compiles TypeScript and builds optimized production bundle

### Preview
```bash
npm run preview
```
Serves the production build locally for testing

## TypeScript Configuration

- **Target**: ES2020 with modern browser support
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled with unused locals/parameters checking
- **Top-level await**: Supported via esbuild configuration

## Code Quality Standards

- **ESLint**: Airbnb base configuration with TypeScript support
- **Prettier**: Automatic formatting with auto line endings
- **Import resolution**: Supports .ts extensions without explicit imports
- **No console restrictions**: Console logging allowed for debugging

## WebAssembly Integration

- **web-ifc WASM**: Loaded from CDN (https://unpkg.com/web-ifc@0.0.69/)
- **Fragment workers**: Loaded from CDN for geometry processing
- **Auto WASM setup**: Disabled for custom configuration