# ADR-003: New Landing Page with Step-by-Step IFC Validation Workflow

## Status

Accepted

## Date

2025-09-19

## Context

The BIM-IDS Validator application initially presented users with direct access to the 3D viewer interface, requiring them to navigate through various UI panels to complete the IFC validation workflow. This approach presented several user experience and architectural challenges:

- **Unclear User Journey**: New users struggled to understand the required steps for successful IFC validation
- **Hidden Process Status**: No clear indication of progress through the multi-step validation process
- **Poor Error Context**: When errors occurred, users lacked context about which step failed and why
- **Monolithic UI Structure**: All functionality embedded in a single viewer interface made the codebase harder to maintain and extend
- **No Session History**: Users couldn't track their previous conversion attempts or reuse results

The feature requirement (PRD-003) called for transforming the application entry point into a guided, step-by-step landing page that walks users through the IFC file validation process while maintaining full access to the existing viewer functionality.

## Decision

We have implemented a new landing page architecture that introduces a guided 4-step workflow for IFC validation while preserving all existing viewer capabilities. The implementation consists of:

### User Interface Architecture

**4-Step Progressive Workflow:**
1. **Step 1 - IFC Upload**: Drag-and-drop interface for IFC file selection with immediate validation
2. **Step 2 - Fragment Conversion**: Automated conversion with progress indicators and log viewing
3. **Step 3 - IDS Upload**: Optional IDS specification upload for validation
4. **Step 4 - View Results**: Access to validation results and 3D viewer with highlighted elements

**Visual Design Patterns:**
- Step indicators with three states: waiting (gray), in-progress (blue with animation), completed (green with checkmark)
- Progressive disclosure enabling steps only when prerequisites are complete
- Vertical layout with connecting lines showing workflow progression
- Toast notifications for errors and success messages
- Collapsible log viewers for debugging

### Frontend Architecture Changes

**Component Structure:**
```
src/
├── pages/                          # Page-level components
│   ├── LandingPage.ts             # Main landing page orchestrator
│   └── ViewerPage.ts              # Refactored viewer (existing functionality)
├── components/steps/              # Step-specific components
│   ├── StepWrappers.ts           # Step container logic
│   ├── IFCUploadStep.ts          # Drag-and-drop upload
│   ├── FragmentConversionStep.ts  # Conversion progress
│   ├── IDSUploadStep.ts          # IDS file handling
│   └── ViewResultsStep.ts        # Results display
├── services/
│   └── ConversionStateManager.ts  # Centralized state management
└── styles/
    └── landing-page.css           # Landing page specific styles
```

**Routing Implementation:**
- Simple hash-based routing without external dependencies
- Routes:
  - `#/` or `#/landing` → Landing page
  - `#/viewer` → Direct viewer access
  - `#/viewer?model={fileId}` → Viewer with pre-loaded model
  - `#/viewer?model={fileId}&results={resultsId}` → Viewer with validation results

**State Management Pattern:**
- Singleton `ConversionStateManager` service maintaining:
  - Current step and status
  - File references and IDs
  - Job tracking for async operations
  - Conversion history (last 10 items)
  - Real-time logs for each operation
- Observer pattern for component updates via subscription model

### API Integration Architecture

**Frontend-Backend Communication:**
- Unified API base URL (`/api/v1`) working in both development and production
- Development: Vite proxy redirects to `localhost:3001`
- Production: Nginx reverse proxy to backend container
- Multipart form data for file uploads (500MB limit)
- Polling mechanism for job status (2-second intervals)

**Error Handling Strategy:**
- Client-side file validation before upload
- Toast notifications for user feedback
- Detailed error logging in collapsible viewers
- Graceful degradation on API failures

### Deployment Configuration

**Docker Updates:**
- Frontend Dockerfile with multi-stage builds (build + nginx serving)
- Nginx configuration with:
  - SPA routing support (try_files fallback)
  - API proxy to backend service
  - 1GB client_max_body_size for large IFC files
  - Gzip compression for assets

**Development Environment:**
- Vite dev server with API proxy configuration
- Hot module replacement preserved
- Consistent API paths between dev and production

## Consequences

### Positive Consequences

1. **Improved User Experience**:
   - Clear, guided workflow reduces user confusion
   - Visual progress indicators provide immediate feedback
   - Step-by-step approach prevents errors from missing prerequisites
   - Session history enables workflow resumption

2. **Better Architecture**:
   - Separation of concerns between landing and viewer
   - Modular step components enable independent development
   - Centralized state management simplifies testing
   - Clean routing structure supports future expansion

3. **Enhanced Maintainability**:
   - Each step can be modified independently
   - Clear component boundaries reduce coupling
   - State management pattern enables debugging
   - CSS isolation prevents style conflicts

4. **Deployment Flexibility**:
   - Frontend can be deployed independently
   - Nginx configuration enables CDN integration
   - Static asset serving optimized
   - API proxy pattern supports microservices evolution

### Negative Consequences

1. **Increased Complexity**:
   - Additional routing layer to maintain
   - More components and files to manage
   - State synchronization requirements
   - Polling mechanism adds network overhead

2. **Migration Requirements**:
   - Existing users need to adapt to new workflow
   - Documentation needs updating
   - Testing coverage needs expansion
   - Potential for routing edge cases

3. **Technical Debt**:
   - In-memory conversion history (lost on refresh)
   - No WebSocket support (polling only)
   - Single-file processing limitation
   - No operation cancellation mechanism

## Implementation Details

### Key Technical Decisions

1. **No External Router Library**: Implemented custom hash-based routing to minimize dependencies
2. **Template Literals for UI**: Continued use of `@thatopen/ui` BUI.html templates for consistency
3. **Singleton State Manager**: Ensures single source of truth across components
4. **File Buffer Storage**: Maintains IFC buffer in memory for validation after conversion
5. **Progressive Enhancement**: Landing page enhances but doesn't replace viewer access

### Migration Path

1. Landing page deployed alongside existing viewer
2. Index.html updated to default to landing route
3. Direct viewer access preserved via URL
4. No data migration required (greenfield approach)

### Monitoring Considerations

Track these metrics post-deployment:
- Step completion rates
- Average time per step
- Error rates by step
- File size distribution
- Browser compatibility issues

## References

- Feature PRD: `docs/features/003_new_landing_page/PRD.md`
- Implementation Guide: `docs/features/003_new_landing_page/IMPLEMENTATION_GUIDE.md`
- ADR-002: Backend API Architecture (prerequisite for API integration)
- Original viewer documentation: `src/bim-components/README.md`

## Future Considerations

1. **Phase 2 Enhancements**:
   - WebSocket support for real-time progress
   - Multiple file batch processing
   - LocalStorage persistence for conversion history
   - Operation cancellation capabilities

2. **Phase 3 Evolution**:
   - User accounts and cloud storage
   - Conversion templates and presets
   - Comparative validation analysis
   - PDF report generation

3. **Technical Improvements**:
   - Service Worker for offline support
   - IndexedDB for local file caching
   - Web Workers for heavy computations
   - Internationalization support