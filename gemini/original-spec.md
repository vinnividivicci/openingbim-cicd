# **Specification: In-Browser BIM/IDS Validation Tool**

Version: 1.3  
Date: July 16, 2025

## **1\. Overview**

### **1.1. Project Goal**

The primary goal of this project is to develop a fully client-side web application that allows users to validate Building Information Modeling (BIM) data from an IFC file against a set of requirements defined in an Information Delivery Specification (IDS) file. The entire process, from file loading to validation and visualization of results, will occur directly within the user's web browser.

### **1.2. Core Principles**

* Zero Data Upload: No IFC, IDS, or any other project data is ever uploaded to a server.  
* Instantaneous Feedback: By eliminating server round-trips, the validation process provides immediate results.  
* Client-Side Processing: All heavy computation is offloaded to the user's browser using WebAssembly (WASM).  
* Open Source Foundation: The application will be built exclusively on open-source libraries.

### **1.3. MVP Exclusions**

* No User Authentication: The application will be fully anonymous.  
* No AI Features: No integration of artificial intelligence or machine learning.  
* No Server-Side Processing: The server's only role is to deliver the initial static assets.  
* No Analytics: No user tracking or usage metrics.

## **2\. System Architecture & Methodology**

### **2.1. Technology Stack**

* Frontend Framework: Vanilla HTML5, CSS3, and modern JavaScript (ES6+).  
* Core BIM Libraries:  
  * @thatopen/components: For high-level UI components and functionalities.  
  * @thatopen/ui: For creating the user interface elements.  
  * @thatopen/fragments: The underlying engine for efficient geometry handling.  
  * web-ifc (via components): The WASM-powered engine for parsing IFC files.  
* 3D Rendering: three.js.

### **2.2. Backend Architecture**

The backend's role is strictly limited to serving the static application files (HTML, CSS, JS, WASM).

### **2.3. Development Methodology**

This project will adhere to a Test-Driven Development (TDD) approach. The cycle for any new feature will be: Write a failing test, write the implementation to pass the test, and then refactor.

## **3\. User Interface & Workflow**

### **3.1. Main View Layout & Visual Design**

The UI will be clean, modern, and branded to match the "Opening BIM" website aesthetic.

* Color Palette: The design will use a dark theme with a primary blue accent (\--primary: \#00A9FF), dark surfaces (\--surface: \#1E1E1E), and white primary text.  
* Typography: The interface will use the 'Inter' font for clarity and modern appeal.  
* Layout: The application is divided into three main sections:  
  * Top Toolbar: Contains primary actions.  
  * Side Panel (Left): A collapsible overlay panel for results.  
  * 3D Viewer (Center/Right): The main interaction area.

### **3.2. Detailed Step-by-Step User Workflow**

1. Initial State: The application loads with an empty 3D viewer. "Load IDS" and "Run Validation" buttons are disabled. The side panel is hidden.  
2. IFC File Loading: The user loads an IFC file. The model appears in the viewer, and the "Load IDS" button is enabled.  
3. IDS File Loading: The user loads an IDS file. The "Run Validation" button is enabled.  
4. Validation Execution: The user clicks "Run Validation." The side panel slides into view from the left, displaying a loading spinner.  
5. Displaying Results: After a brief processing period, the spinner is replaced with the validation results. All failing elements in the 3D model are automatically highlighted in red.  
6. Interaction & Analysis: The user can click on an issue in the side panel to zoom to the corresponding element in the viewer. A close button on the panel allows it to be dismissed.  
7. Reporting: An "Export BCF" button is present for future implementation.

## **4\. Core Features & Implementation Logic**

| Feature ID | Feature Name | Implementation Details |
| :---- | :---- | :---- |
| FE-01 | File Loading & State Management | \- Implement onclick handlers for toolbar buttons. \<br\>- Manage the enabled/disabled state (btn-primary vs. btn-disabled classes) based on whether an IFC and IDS have been loaded. |
| FE-02 | Drag-and-Drop Handling | \- Add event listeners to the viewer area. \<br\>- On dragenter, activate a visual overlay (dashed blue border with an icon) to indicate a valid drop target. \<br\>- On drop, check the file extension and call the appropriate loading function. |
| FE-03 | Validation Engine | \- The "Run Validation" handler calls IDS.validate(model). \<br\>- Display a loading spinner in the results panel while validation is in progress. |
| FE-04 | Interactive 3D Viewer | \- Initialize SimpleScene, SimpleRenderer, SimpleCamera, and SimpleRaycaster. \<br\>- Add a SimpleGrid for visual reference. |
| FE-05 | Results Visualization | \- Use the FragmentHighlighter component. \<br\>- After validation, call highlighter.highlight("fail", ids) with the list of failing element IDs to color them red. |
| FE-06 | Detailed Issue Reporting UI | \- The side panel will be a BUI.Panel that slides in from the left and can be dismissed. \<br\>- Dynamically render results using collapsible \<details\> sections for each IDS requirement. \<br\>- Use colored badges to clearly indicate "PASSED" (green) or "X FAILED" (red) status for each requirement. \<br\>- Individual issue items should have a hover state (hover:bg-\[var(--primary-hover)\]/20) to indicate they are clickable. |
| FE-07 | BCF Export | \- This feature is planned for a future version and the button will be present but likely disabled in the MVP. |

## **5\. Non-Functional Requirements**

* Performance: Responsive while loading IFC files up to 150MB.  
* Security: No user data is transmitted from the client.  
* Usability: Intuitive workflow requiring no prior training.  
* Browser Compatibility: Fully functional on the latest stable versions of Chrome, Firefox, and Edge.