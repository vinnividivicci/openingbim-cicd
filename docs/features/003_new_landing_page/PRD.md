# Product Requirements Document: New Landing Page with 4-Step IFC Validation Process

## Document Information
- **Feature ID**: 003
- **Feature Name**: New Landing Page with Step-by-Step IFC Processing
- **Created Date**: 2025-09-19
- **Version**: 1.0
- **Status**: In Development

## 1. Executive Summary

### 1.1 Purpose
Transform the current direct-to-viewer application entry point into a guided, step-by-step landing page that walks users through the IFC file validation process. This change improves user experience by providing clear workflow stages and progress visibility.

### 1.2 Goals
- Simplify the IFC validation workflow for new users
- Provide clear progress indicators throughout the process
- Maintain access to the existing viewer functionality
- Enable file persistence and conversion history tracking
- Improve error visibility and troubleshooting capabilities

## 2. User Stories

### 2.1 Primary User Story
**As a** BIM professional
**I want to** have a guided process for validating IFC files against IDS specifications
**So that I** can easily understand each step and track my progress through the validation workflow

### 2.2 Supporting User Stories
- **As a user**, I want to drag-and-drop IFC files for quick upload
- **As a user**, I want to see conversion progress and logs if needed
- **As a user**, I want to download converted fragments and validation results
- **As a user**, I want to return to previous conversions in my session
- **As a user**, I want to view my model with or without validation results

## 3. Functional Requirements

### 3.1 Landing Page Structure

#### 3.1.1 Page Layout
- Replace current direct-to-viewer entry point
- Vertical step-by-step layout with 4 distinct stages
- Modern, sleek visual design with animations
- Progress indicators showing completed, in-progress, and waiting states
- Navigation header with ability to return from viewer

#### 3.1.2 Step Indicators Visual Style
- Numbered circles (1-4) with connecting lines
- Three states per step:
  - **Waiting**: Gray/neutral color
  - **In Progress**: Blue with animation (spinner or pulse)
  - **Completed**: Green with checkmark
- Description text below each step number
- Smooth transitions between states

### 3.2 Step 1: Upload IFC File

#### 3.2.1 Functionality
- Large drag-and-drop zone with visual feedback on hover
- Alternative "Browse" button for traditional file selection
- File validation: Accept only .ifc extension
- Display uploaded file name and size
- No file size limit enforced (for now)

#### 3.2.2 User Interaction
- Drag file over zone → Visual highlight
- Drop file → Immediate validation check
- Invalid file → Toast error notification
- Valid file → Proceed to Step 2 automatically

#### 3.2.3 State Management
- Prevent new uploads while conversion in progress
- Show current conversion status if user navigates away and returns

### 3.3 Step 2: IFC to Fragment Conversion

#### 3.3.1 Functionality
- Automatically triggers upon successful IFC upload
- Uses backend API endpoint: `POST /api/v1/fragments`
- Shows spinner during conversion
- Displays "View Logs" collapsible button
- Shows "Download Fragment" button when complete
- Shows "View Model" button when complete

#### 3.3.2 Progress Indication
- Spinner animation during processing
- Real-time log streaming (if technically feasible)
- Success/failure status upon completion

#### 3.3.3 User Actions When Complete
- **View Model**: Opens viewer with converted fragment loaded
- **Download Fragment**: Downloads .frag file
- **View Logs**: Expands to show conversion logs
- **Continue**: Enables Step 3 for IDS upload

### 3.4 Step 3: Upload IDS File

#### 3.4.1 Functionality
- Enabled only after successful fragment conversion
- Similar UI to Step 1 (drag-and-drop + browse)
- File validation: Accept .ids and .xml extensions
- Automatically triggers validation upon upload

#### 3.4.2 Validation Process
- Uses backend API endpoint: `POST /api/v1/ids/check`
- Shows spinner during validation
- Displays "View Logs" collapsible button
- Success/failure indication

#### 3.4.3 Optional Step
- User can skip this step and go directly to viewer
- Step 4 only enabled if IDS validation completes

### 3.5 Step 4: View Results

#### 3.5.1 Functionality
- Enabled after both fragment conversion and IDS validation
- Shows summary of validation results
- "Download Results" button for raw JSON/XML
- "Show Results in Viewer" button

#### 3.5.2 Viewer Integration
- Opens viewer with fragment model loaded
- Displays validation results overlay
- Highlights failed/passed elements per existing functionality

## 4. Technical Specifications

### 4.1 Architecture Changes

#### 4.1.1 New Components Structure
```
src/
├── pages/
│   ├── LandingPage.ts       # Main landing page component
│   └── ViewerPage.ts         # Relocated viewer logic
├── components/
│   └── steps/
│       ├── IFCUploadStep.ts
│       ├── FragmentConversionStep.ts
│       ├── IDSUploadStep.ts
│       └── ViewResultsStep.ts
├── router/
│   └── index.ts              # Simple hash-based routing
├── services/
│   └── ConversionStateManager.ts  # State management
└── styles/
    └── landing-page.css      # Landing page specific styles
```

#### 4.1.2 Routing Implementation
- Simple hash-based routing (no external library needed)
- Routes:
  - `#/` or `#/landing` → Landing Page
  - `#/viewer` → Viewer (with optional query params for model/results)
  - `#/viewer?model={fileId}` → Viewer with specific model
  - `#/viewer?model={fileId}&results={resultsId}` → Viewer with validation

### 4.2 State Management

#### 4.2.1 ConversionStateManager
- Singleton service managing conversion state
- Tracks:
  - Current conversion job ID
  - Conversion history (in-memory array)
  - File IDs for fragments and results
  - Upload progress and status
- Persists during session (not across page refreshes initially)

#### 4.2.2 API Integration
```typescript
interface ConversionState {
  step: 1 | 2 | 3 | 4;
  ifcFile?: File;
  fragmentFileId?: string;
  idsFile?: File;
  validationResultsId?: string;
  jobId?: string;
  status: 'idle' | 'uploading' | 'converting' | 'validating' | 'complete' | 'error';
  error?: string;
  logs?: string[];
}
```

### 4.3 Backend API Endpoints (Existing)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/fragments` | POST | Convert IFC to fragments |
| `/api/v1/fragments/:fileId` | GET | Download fragment file |
| `/api/v1/ids/check` | POST | Validate fragments against IDS |
| `/api/v1/ids/results/:fileId` | GET | Get validation results |
| `/api/v1/jobs/:jobId` | GET | Check job status |

### 4.4 UI Components

#### 4.4.1 Using @thatopen/ui
- Leverage existing BUI components
- Custom templates using BUI.html template literals
- Consistent with existing app design system

#### 4.4.2 Toast Notifications
```typescript
interface ToastConfig {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number; // milliseconds
}
```

## 5. User Experience Design

### 5.1 Visual Design Principles
- Clean, modern interface
- Clear visual hierarchy
- Consistent color coding for states
- Smooth animations for transitions
- Responsive layout (desktop-first)

### 5.2 Interaction Patterns
- Progressive disclosure (steps enable sequentially)
- Immediate feedback for all actions
- Non-blocking errors (toast notifications)
- Optional advanced features (logs viewing)

### 5.3 Accessibility Considerations
- Keyboard navigation support
- ARIA labels for screen readers
- Sufficient color contrast
- Clear focus indicators

## 6. Error Handling

### 6.1 Error Scenarios

| Scenario | User Feedback | Recovery |
|----------|---------------|-----------|
| Invalid file type | Toast: "Please select a valid .ifc file" | Clear selection, enable retry |
| Backend unavailable | Toast: "Server connection failed" | Show retry button |
| Conversion failure | Toast: Error message from API | Show logs, enable re-upload |
| Validation failure | Toast: "Validation failed" | Show detailed error, allow retry |
| Network timeout | Toast: "Request timed out" | Show retry option |

### 6.2 Logging
- Console logs for debugging (development)
- User-visible logs for conversion/validation steps
- Expandable log viewer with timestamp

## 7. Performance Considerations

### 7.1 File Upload
- Client-side file validation before upload
- Multipart form data for large files
- No client-side file size limit

### 7.2 Progress Tracking
- Polling mechanism for job status (every 2 seconds)
- WebSocket upgrade path (future enhancement)

### 7.3 Memory Management
- Clear file references after upload
- Limit conversion history to last 10 items
- Clean up blob URLs after download

## 8. Testing Requirements

### 8.1 Unit Tests
- State management logic
- File validation functions
- API service methods
- Router navigation

### 8.2 Integration Tests
- Full upload → conversion → validation flow
- Error recovery scenarios
- Navigation between pages

### 8.3 Manual Testing Checklist
- [ ] Drag-and-drop works on all browsers
- [ ] File validation catches invalid files
- [ ] Progress indicators update correctly
- [ ] Logs display properly
- [ ] Downloads work for fragments and results
- [ ] Navigation between landing and viewer
- [ ] Error toasts appear and dismiss
- [ ] Backend unavailable handling

## 9. Future Enhancements

### 9.1 Phase 2 Features
- Multiple file processing queue
- Conversion history persistence (localStorage)
- Cancel in-progress operations
- Batch IFC upload
- Progress percentage display
- Time estimation for conversion

### 9.2 Phase 3 Features
- User accounts and cloud storage
- Conversion presets/templates
- Comparison between validation runs
- Export validation report as PDF
- WebSocket real-time updates

## 10. Migration Strategy

### 10.1 Deployment Plan
1. Deploy new landing page alongside existing viewer
2. Update entry point in index.html
3. Preserve direct viewer access via URL
4. No data migration required (greenfield)

### 10.2 Rollback Plan
- Feature flag to toggle between old/new entry points
- Viewer remains functional independently
- No backend changes required

## 11. Success Metrics

### 11.1 User Engagement
- Completion rate of 4-step process
- Time to complete validation workflow
- Error rate reduction
- User feedback scores

### 11.2 Technical Metrics
- Page load time < 2 seconds
- Conversion success rate > 95%
- API response time < 500ms
- Zero data loss incidents

## 12. Dependencies

### 12.1 Technical Dependencies
- Existing backend API endpoints
- @thatopen/ui component library
- Docker container for file persistence
- Modern browser with drag-and-drop API

### 12.2 External Dependencies
- No additional third-party services required
- No new npm packages required (use existing)

## 13. Appendices

### 13.1 Mockup Reference
Step indicator style should follow the provided image pattern with numbered circles and connecting lines showing progress states.

### 13.2 API Documentation
Refer to `src/server/routes/v1/` for detailed endpoint specifications.

### 13.3 Existing Viewer Documentation
Maintain all existing viewer functionality as described in project documentation.

---

**Document Status**: Ready for Implementation
**Next Steps**: Begin implementation following the technical specifications outlined above.