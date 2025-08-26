# Project Overview

This project is a client-side web application for validating Building Information Modeling (BIM) data from IFC files against Information Delivery Specification (IDS) requirements. It allows users to load and visualize IFC files in an interactive 3D viewer, validate them against IDS specifications, and see the results in real-time. All processing happens in the browser, ensuring data privacy.

## Main Technologies

*   **Frontend:** Vanilla TypeScript with Vite
*   **3D Rendering:** Three.js
*   **BIM Processing:** @thatopen/components ecosystem
*   **IFC Parsing:** web-ifc (WebAssembly)
*   **Build Tool:** Vite
*   **Testing:** Vitest

## Architecture

The application is a single-page application (SPA) with a main entry point in `src/main.ts`. This file initializes the 3D world, camera, renderer, and all the BIM-related components. The UI is built using a combination of custom components and templates. The application is structured into several modules, including `bim-components` for BIM-specific logic and `ui-templates` for UI elements.

# Building and Running

## Prerequisites

*   Node.js (version 16 or higher)

## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Application

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Testing

To run the tests:

```bash
npm run test
```

To run the tests with a UI:

```bash
npm run test:ui
```

To generate a test coverage report:

```bash'
npm run test:coverage
```

# Development Conventions

*   **Coding Style:** The project uses ESLint with the Airbnb base configuration and Prettier for code formatting.
*   **Testing:** The project uses Vitest for unit testing. Tests are located in files with the `.test.ts` extension.
*   **Modules:** The code is organized into modules using ES modules.
*   **Typing:** The project is written in TypeScript and uses type annotations.
