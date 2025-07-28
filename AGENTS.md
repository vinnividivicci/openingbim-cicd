# Agent Instructions for openingbim-cicd

## Build & Development Commands
- **Dev server**: `npm run dev` (runs Vite with host access)
- **Build**: `npm run build` (runs TypeScript check then Vite build)
- **Preview**: `npm run preview` (preview production build)
- **Lint**: `npx eslint src/**/*.ts` (ESLint with Airbnb + Prettier config)
- **Format**: `npx prettier --write src/**/*.ts`
- **Type check**: `npx tsc --noEmit`

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, ES2020 target, ESNext modules
- **Imports**: Use ES6 imports, no extensions for .ts files, organize by: external libs → @thatopen libs → local files
- **Formatting**: Prettier with auto endOfLine, enforced via ESLint
- **Naming**: PascalCase for classes/components, camelCase for functions/variables, UPPER_CASE for constants
- **Error handling**: Use try-catch blocks, log errors to console (no-console rule disabled)
- **Components**: Extend OBC.Component base class, use static uuid property
- **UI**: Use @thatopen/ui BUI.html template literals for UI components
- **Three.js**: Import as `* as THREE`, use 0x hex notation for colors
- **No semicolons**: Prettier handles this automatically
- **No unused vars**: TypeScript strict mode catches these