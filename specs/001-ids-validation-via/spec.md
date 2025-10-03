# Feature Specification: Direct IFC to IDS Validation Workflow

**Feature Branch**: `001-ids-validation-via`
**Created**: 2025-10-03
**Status**: Draft
**Input**: User description: "IDS validation via ifctester (the Python library being used) works directly with IFC files, not fragments. Fragments are a ThatOpen-specific format purely for optimized 3D rendering. The current workflow of IFC → fragments → IDS validation is doing an unnecessary conversion. You could simplify to: For validation only: 1. Upload IFC 2. Run IDS validation directly on IFC. When visualization is needed: 3. Convert IFC to fragments 4. Display validation results with 3D highlighting. This would be more efficient since fragments conversion is computationally expensive and only serves the visualization step. The backend's IfcTesterService should be able to accept IFC files directly rather than fragments."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## Clarifications

### Session 2025-10-03
- Q: When a user uploads an IFC file for validation and later wants to visualize results, how should the system handle the IFC file? → A: Cache the IFC file temporarily and auto-delete after 1 hour
- Q: When a user requests 3D visualization without having first run validation, how should the system behave? → A: Display visualization without validation results (plain 3D view only)
- Q: What is the maximum IFC file size the system should accept for upload? → A: 1 GB (large models)
- Q: What performance improvement is expected for validation-only requests compared to the old IFC → fragments → validation workflow? → A: No specific target, any improvement acceptable
- Q: When IFC validation or visualization conversion fails, what information should the system provide to the user? → A: Error type and brief reason ("Invalid IFC structure: missing required property")

---

## User Scenarios & Testing

### Primary User Story
A user uploads an IFC model file and an IDS specification file to validate compliance. The system performs validation directly on the IFC file and returns results indicating which requirements passed or failed. If the user needs to visualize the validation results in 3D, they can request visualization which converts the IFC to an optimized format and displays highlighted elements.

### Acceptance Scenarios
1. **Given** a user has an IFC file and an IDS specification file, **When** they upload both files for validation, **Then** the system validates the IFC directly against the IDS and returns validation results without requiring intermediate file conversion
2. **Given** validation results have been generated, **When** the user requests 3D visualization, **Then** the system converts the IFC to an optimized format and displays the model with validation results highlighted
3. **Given** a user only wants validation results, **When** they upload files for validation, **Then** the system completes validation without performing unnecessary 3D model conversion
4. **Given** a large IFC file requiring validation, **When** the user uploads it, **Then** the validation completes in less time than the previous workflow because it skips the fragments conversion step (no specific performance target required, any measurable improvement is acceptable)
5. **Given** a user uploads an IFC file without an IDS specification, **When** they request 3D visualization, **Then** the system displays the model in plain 3D view without validation results
6. **Given** a user uploads a corrupted or invalid IFC file, **When** validation or conversion fails, **Then** the system returns an error message containing the error type and a brief reason for the failure

### Edge Cases
- When an IFC file is uploaded for validation but later visualization is requested, the system caches the original IFC file temporarily and auto-deletes it after 1 hour
- When a user requests visualization without first running validation, the system displays the 3D model without validation results (plain 3D view only)
- When a user attempts to upload an IFC file exceeding 1 GB, the system rejects the upload with a clear error message indicating the size limit
- When validation fails due to invalid IFC structure or conversion errors, the system provides the error type and a brief reason (e.g., "Invalid IFC structure: missing required property")

## Requirements

### Functional Requirements
- **FR-001**: System MUST accept IFC files directly for IDS validation without requiring prior conversion to fragments
- **FR-002**: System MUST perform IDS validation using the uploaded IFC file as the primary input
- **FR-003**: System MUST return validation results showing pass/fail status for each IDS requirement
- **FR-004**: Users MUST be able to request 3D visualization of validation results as a separate, optional step
- **FR-005**: System MUST convert IFC to optimized 3D format only when visualization is explicitly requested
- **FR-006**: System MUST preserve validation results and cache the original IFC file for 1 hour to enable visualization requests
- **FR-007**: System MUST maintain the same validation accuracy and completeness as the previous workflow
- **FR-008**: System MUST support validation and visualization as independent operations that can be performed separately or combined
- **FR-009**: System MUST accept IFC files up to 1 GB in size and reject larger files with a clear error message
- **FR-010**: System MUST provide meaningful error messages when validation or conversion fails, including the error type and a brief reason for the failure

### Non-Functional Requirements
- **NFR-001**: Validation-only workflow SHOULD complete faster than the previous IFC → fragments → validation workflow; any measurable improvement is acceptable (no specific performance target required)
- **NFR-002**: Cached IFC files MUST be automatically deleted after 1 hour to manage storage resources

### Key Entities
- **IFC File**: The building information model file uploaded by the user, containing 3D geometry and metadata about building elements
- **IDS Specification**: The validation specification file that defines compliance requirements for the IFC model
- **Validation Results**: The output showing which IDS requirements passed or failed, including details about non-compliant elements
- **Optimized 3D Model**: A converted representation of the IFC file optimized for web-based 3D rendering and visualization

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
- [x] Clarifications completed (5 questions resolved)

---
