# Implementation Plan

**Note:** IDS validation API is confirmed working with @thatopen/components. The `load()` and `spec.test()` methods successfully process real IDS specifications and return accurate validation results.

- [x] 1. Initialize built-in IDS component and create integration wrapper




  - Initialize OBC.IDSSpecifications component in main.ts alongside existing components
  - Create IDS integration wrapper class to simplify UI access to built-in functionality
  - Add basic error handling for IDS component initialization
  - _Requirements: 6.1, 6.4_

- [x] 2. Extend Models Panel to support IDS file loading






  - Add IDS file loading option to existing Models Panel context menu
  - Implement file dialog for .ids file selection with proper file type filtering
  - Integrate IDS file loading with the IDS integration wrapper
  - Add visual feedback for successful IDS file loading in Models Panel
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Create validation execution interface in Models Panel






  - Add "Run Validation" button to Models Panel when both IFC and IDS files are loaded
  - Implement validation trigger that calls built-in OBC.IDSSpecifications validation
  - Add loading state and progress feedback during validation execution
  - Handle validation completion and error states with user-friendly messages
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 4. Create validation results panel UI template






  - Create new panel section template following existing pattern (similar to models.ts)
  - Implement collapsible sections for each IDS specification using HTML details elements
  - Add status badges (green "PASSED", red "X FAILED") for each requirement
  - Create expandable lists for failed elements with hover states
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2_

- [x] 5. Integrate validation results panel into content grid layout
  - Extend ContentGridElements type to include validation results panel
  - Update content grid template to include validation panel in layout
  - Add validation panel to grid elements initialization
  - Test responsive layout behavior with validation panel added
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 6. Implement result data transformation and state management





  - Create UI state manager for validation results display state
  - Transform built-in validation results into UI-friendly format
  - Implement reactive updates when validation results change
  - Add selection state management for specifications and requirements
  - _Requirements: 3.1, 3.2, 7.3_

- [x] 7. Integrate validation highlighting with existing 3D viewer






  - Use existing Highlighter component to mark validation failures in 3D viewer
  - Implement distinct validation highlighting colors separate from selection/measurement colors
  - Add automatic highlighting of failed elements when validation completes
  - Implement highlight clearing when new validation is run
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 8. Add element focusing and click-to-navigate functionality





  - Implement click handlers for failed elements in validation results panel
  - Use existing camera controls to focus on selected elements in 3D viewer
  - Add element selection integration with existing selection system
  - Test smooth camera transitions and element highlighting coordination
  - _Requirements: 4.2, 4.5_

- [x] 9. Add validation result export functionality (Partially Complete)
  - Implement export button in validation results panel ✓
  - Create JSON export of validation results using built-in result data ✓
  - Add CSV export option for tabular result data (method exists but not exposed in UI)
  - Handle export errors and provide download functionality ✓
  - _Requirements: 5.1, 5.2, 5.3, 5.5_
- [ ] 10. Add comprehensive error handling and user feedback
  - Implement error handling for IDS file parsing failures
  - Add user-friendly error messages for validation execution errors
  - Create fallback UI states for when validation fails or is unavailable
  - Add loading states and progress indicators throughout the validation workflow
  - _Requirements: 2.5, 5.5, 6.1_

- [ ] 11. Create unit tests for IDS integration components
  - Write tests for IDS integration wrapper functionality
  - Test UI state manager with mock validation results
  - Create tests for result data transformation functions
  - Test error handling and edge cases in integration layer
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. Create integration tests for end-to-end validation workflow
  - Test complete workflow from IDS loading to result display
  - Verify integration with existing Highlighter and camera controls
  - Test validation panel integration with existing grid layout system
  - Validate responsive behavior and accessibility of new UI components
  - _Requirements: 7.4, 7.5_