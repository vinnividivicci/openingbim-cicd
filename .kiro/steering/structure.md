# Project Structure & Organization

## Root Directory Structure

```
bim-app/
├── src/                    # Main source code
├── gemini/                 # Product specifications and mockups
├── .kiro/                  # Kiro AI assistant configuration
├── .vscode/                # VS Code workspace settings
├── node_modules/           # Dependencies
├── index.html              # Main HTML entry point
├── package.json            # Project configuration and dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── .eslintrc.cjs           # ESLint configuration
```

## Source Code Organization (`src/`)

### Core Files
- **`main.ts`** - Application entry point and initialization
- **`globals.ts`** - Global constants, icons, and shared configuration
- **`style.css`** - Global styles and CSS custom properties
- **`vite-env.d.ts`** - Vite environment type definitions

### Component Structure
- **`bim-components/`** - Custom BIM-specific components
  - `index.ts` - Component exports
  - `CustomComponent/` - Individual component implementations
  
- **`ui-templates/`** - UI template definitions
  - `index.ts` - Template exports
  - `buttons/` - Button component templates
  - `grids/` - Grid layout templates  
  - `groups/` - Component group templates
  - `sections/` - Panel section templates
  - `toolbars/` - Toolbar templates

## Architecture Patterns

### Component-Based Architecture
- Uses `@thatopen/ui` BUI.Component system
- Template-based component creation with state management
- Modular UI components in separate template files

### 3D Scene Management
- Single world instance with scene, camera, and renderer
- Component-based systems (Worlds, Grids, Clipper, etc.)
- Event-driven interactions and measurements

### State Management
- Global constants in `globals.ts`
- Component-specific state through BUI templates
- URL hash-based layout persistence

## Naming Conventions

### Files & Directories
- **kebab-case** for directories (`bim-components`, `ui-templates`)
- **camelCase** for TypeScript files (`main.ts`, `globals.ts`)
- **PascalCase** for component directories (`CustomComponent/`)

### Code Conventions
- **SCREAMING_SNAKE_CASE** for constants (`CONTENT_GRID_ID`)
- **camelCase** for variables and functions
- **PascalCase** for types and interfaces
- **kebab-case** for CSS custom properties (`--bim-ui_gray-0`)

## Import Organization
- External libraries first (`three`, `@thatopen/*`)
- Internal modules second (`./ui-templates`, `./globals`)
- Grouped by functionality with clear separation

## CSS Architecture
- CSS custom properties for theming
- Dark/light theme support via CSS classes
- Component-scoped styling with BIM UI system
- Responsive design patterns