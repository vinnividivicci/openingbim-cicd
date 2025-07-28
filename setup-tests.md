# Setting Up Unit Tests for IDS Validation

This document explains how to set up and run the unit tests for the IDS validation functionality.

## 1. Install Testing Dependencies

Run the following command to install the required testing dependencies:

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/dom @types/node
```

## 2. Update package.json

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## 3. Fix vitest.config.ts

Replace the content of `vitest.config.ts` with:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
})
```

## 4. Fix test setup file

Update `src/test/setup.ts` to use `globalThis` instead of `global`:

```typescript
// Test setup file for vitest
// This file sets up the testing environment

// Mock DOM APIs that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock FileReader if needed
if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    result: string | ArrayBuffer | null = null
    error: any = null
    readyState: number = 0

    onload: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null

    readAsText(file: Blob) {
      setTimeout(() => {
        this.result = 'mock file content'
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }

    readAsDataURL(file: Blob) {
      setTimeout(() => {
        this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ='
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }

    readAsArrayBuffer(file: Blob) {
      setTimeout(() => {
        this.result = new ArrayBuffer(8)
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: { result: this.result } })
        }
      }, 0)
    }
  } as any
}
```

## 5. Test Structure

The tests are organized as follows:

### Core Component Tests
- **`src/bim-components/IDSIntegration/index.test.ts`** - Tests for the main IDS integration component
  - File loading functionality
  - Validation execution
  - Result transformation
  - Export functionality
  - Highlighting integration

### State Management Tests
- **`src/bim-components/IDSUIStateManager.test.ts`** - Tests for UI state management
  - State updates and subscriptions
  - Selection management
  - Expansion state tracking
  - Summary calculations

### UI Component Tests
- **`src/ui-templates/sections/validation-results.test.ts`** - Tests for the validation results panel
  - Rendering logic
  - User interactions
  - Export functionality
  - Accessibility

## 6. Running Tests

### Run all tests:
```bash
npm test
```

### Run tests with UI:
```bash
npm run test:ui
```

### Run tests with coverage:
```bash
npm run test:coverage
```

### Run specific test file:
```bash
npx vitest src/bim-components/IDSIntegration/index.test.ts
```

## 7. Test Coverage Goals

The tests aim for:
- **>80% overall coverage**
- **100% coverage for critical paths** (validation execution, result transformation)
- **Comprehensive error handling coverage**
- **Edge case testing**

## 8. Fixing TypeScript Errors

The test files currently have TypeScript errors because vitest is not installed. After installing the dependencies, these errors will be resolved.

## 9. Continuous Integration

To run tests in CI, add to your GitHub Actions workflow:

```yaml
- name: Run tests
  run: npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## 10. Next Steps

1. Install the dependencies
2. Fix the configuration files as shown above
3. Run the tests
4. Fix any failing tests based on actual implementation details
5. Add more tests as needed for edge cases

The test files are written to be comprehensive but may need minor adjustments based on the exact implementation details of your components.