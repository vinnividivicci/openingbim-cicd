# Implementation Guide: New Landing Page

## Overview
This document provides technical implementation details for the new landing page feature described in the PRD.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Landing Page                         │
├───────────────┬───────────┬──────────────┬──────────────┤
│  IFC Upload   │ Conversion │  IDS Upload  │ View Results │
│    Step 1     │   Step 2   │    Step 3    │    Step 4    │
└───────┬───────┴─────┬─────┴──────┬───────┴──────┬───────┘
        │             │            │              │
        └─────────────┴────────────┴──────────────┘
                          │
                  State Manager Service
                          │
        ┌─────────────────┴─────────────────┐
        │         Backend API               │
        │  - /fragments                     │
        │  - /ids/check                     │
        │  - /jobs/:id                      │
        └────────────────────────────────────┘
```

## Component Hierarchy

```
App
├── Router
│   ├── LandingPage
│   │   ├── StepIndicator
│   │   ├── IFCUploadStep
│   │   ├── FragmentConversionStep
│   │   ├── IDSUploadStep
│   │   └── ViewResultsStep
│   └── ViewerPage
│       └── (Existing viewer components)
└── Services
    └── ConversionStateManager
```

## Implementation Steps

### Phase 1: Core Infrastructure (Week 1)
1. Set up routing system
2. Create state management service
3. Move existing viewer to ViewerPage component
4. Create basic LandingPage structure

### Phase 2: Step Components (Week 2)
1. Implement IFC upload with drag-and-drop
2. Create fragment conversion with API integration
3. Build IDS upload component
4. Develop results viewing step

### Phase 3: Polish & Testing (Week 3)
1. Add animations and transitions
2. Implement error handling
3. Add progress indicators
4. Create comprehensive tests

## State Management Flow

```typescript
// Conversion State Flow
IDLE → UPLOADING_IFC → CONVERTING → IDS_READY → VALIDATING → COMPLETE

// State Transitions
onIFCUpload() → setState(UPLOADING_IFC) → API call → setState(CONVERTING)
onConversionComplete() → setState(IDS_READY)
onIDSUpload() → setState(VALIDATING) → API call → setState(COMPLETE)
```

## API Integration Pattern

```typescript
class ConversionService {
  async convertToFragment(ifcFile: File): Promise<string> {
    const formData = new FormData();
    formData.append('ifcFile', ifcFile);

    const response = await fetch('/api/v1/fragments', {
      method: 'POST',
      body: formData
    });

    const { fileId, jobId } = await response.json();

    // Poll for job completion
    await this.pollJobStatus(jobId);

    return fileId;
  }

  private async pollJobStatus(jobId: string): Promise<void> {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/v1/jobs/${jobId}`);
      const { status } = await response.json();

      if (status === 'complete' || status === 'failed') {
        clearInterval(interval);
      }
    }, 2000);
  }
}
```

## UI Component Templates

### Step Indicator Component
```typescript
const stepIndicatorTemplate = (state: StepState) => BUI.html`
  <div class="step-indicator">
    <div class="step ${state.step1.status}">
      <span class="step-number">1</span>
      <span class="step-label">Upload IFC</span>
    </div>
    <div class="step-connector ${state.step2.enabled ? 'active' : ''}"></div>
    <div class="step ${state.step2.status}">
      <span class="step-number">2</span>
      <span class="step-label">Convert</span>
    </div>
    <!-- Steps 3 & 4 similar -->
  </div>
`;
```

### Drag-and-Drop Upload Pattern
```typescript
const dragDropTemplate = (onFileSelect: (file: File) => void) => {
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file?.name.endsWith('.ifc')) {
      onFileSelect(file);
    }
  };

  return BUI.html`
    <div
      class="drop-zone"
      @drop=${handleDrop}
      @dragover=${(e: DragEvent) => e.preventDefault()}
    >
      Drop IFC file here or click to browse
    </div>
  `;
};
```

## CSS Structure

```css
/* Step Indicator Styles */
.step-indicator {
  display: flex;
  align-items: center;
  padding: 2rem;
  gap: 1rem;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step.waiting { color: #666; }
.step.in-progress { color: #3b82f6; }
.step.completed { color: #10b981; }

.step-number {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid currentColor;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.step.in-progress .step-number {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.step-connector {
  flex: 1;
  height: 2px;
  background: #333;
  transition: background 0.3s;
}

.step-connector.active {
  background: #10b981;
}
```

## Router Implementation

```typescript
class SimpleRouter {
  private routes: Map<string, () => void> = new Map();

  constructor() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  register(path: string, handler: () => void) {
    this.routes.set(path, handler);
  }

  navigate(path: string) {
    window.location.hash = path;
  }

  private handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const handler = this.routes.get(hash);
    if (handler) handler();
  }
}
```

## Error Handling Strategy

```typescript
class ErrorHandler {
  static showToast(message: string, type: 'error' | 'success' | 'info') {
    const toast = BUI.Component.create(() => BUI.html`
      <bim-notification type=${type}>
        ${message}
      </bim-notification>
    `);

    document.body.append(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  static async handleAPIError(error: Error) {
    console.error('API Error:', error);

    if (error.message.includes('network')) {
      this.showToast('Network error. Please check your connection.', 'error');
    } else {
      this.showToast('An error occurred. Please try again.', 'error');
    }
  }
}
```

## Testing Approach

### Unit Tests
```typescript
describe('ConversionStateManager', () => {
  it('should transition states correctly', () => {
    const manager = new ConversionStateManager();
    manager.uploadIFC(mockFile);
    expect(manager.state).toBe('UPLOADING_IFC');
  });
});
```

### Integration Tests
```typescript
describe('Landing Page Flow', () => {
  it('should complete full conversion workflow', async () => {
    // Test full flow from IFC upload to results viewing
  });
});
```

## Performance Optimizations

1. **Lazy Loading**: Load viewer components only when needed
2. **File Chunking**: For large IFC files, implement chunked upload
3. **Caching**: Cache conversion results in sessionStorage
4. **Debouncing**: Debounce status polling requests

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Test drag-and-drop compatibility
- Mobile: Desktop-first, mobile optimization in Phase 2

## Deployment Checklist

- [ ] Update frontend build configuration
- [ ] Test all API endpoints
- [ ] Verify Docker container mounts for file storage
- [ ] Update nginx/reverse proxy configuration if needed
- [ ] Add feature flag for gradual rollout
- [ ] Create rollback plan

## Monitoring & Analytics

Track these key metrics:
- Step completion rates
- Average time per step
- Error rates by step
- File size distribution
- Browser/device usage

## Security Considerations

- Validate file types on both client and server
- Implement rate limiting for API endpoints
- Sanitize file names before storage
- Use secure random IDs for file references
- Clear sensitive data from memory after use

## Accessibility Requirements

- ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader announcements for state changes
- Sufficient color contrast (WCAG AA)
- Focus indicators for keyboard users

## Known Limitations

1. Single file processing (no batch support yet)
2. No progress percentage (only spinner)
3. Session-based history (lost on refresh)
4. No cancel operation for in-progress conversions
5. English-only interface

## Future Considerations

1. WebSocket for real-time progress updates
2. Service Worker for offline support
3. IndexedDB for local file caching
4. Web Workers for heavy computations
5. Internationalization support

---

This implementation guide should be updated as development progresses and new patterns emerge.