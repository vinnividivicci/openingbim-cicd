# Product Requirements Document: BIM-IDS Validator Backend APIs

## 1. Introduction

This document outlines the requirements for creating a backend service that exposes the core functionalities of the BIM-IDS Validator application through a set of RESTful APIs. This change will decouple the core processing logic from the frontend, enabling new integrations and improving the overall architecture of the application.

## 2. Problem Statement

The current application is a monolithic frontend application where all the processing (IFC parsing, fragment generation, IDS validation) happens in the browser. This limits the application's scalability, makes it difficult to integrate with other systems, and creates a tight coupling between the processing logic and the UI.

## 3. Goals and Objectives

*   **Decouple Backend and Frontend:** Extract the core processing logic into a separate backend service.
*   **Enable New Integrations:** Expose the core functionalities through a set of well-defined APIs.
*   **Improve Scalability:** Offload the heavy processing from the browser to a dedicated backend service.
*   **Maintain Existing Functionality:** The existing web frontend should continue to work as before, but by using the new APIs.

## 4. Scope

### In Scope

*   Create a new Express.js backend service integrated into the existing application.
*   Develop an API endpoint for uploading an IFC file and converting it to a fragments model.
*   Develop an API endpoint for performing an IDS check.
*   Develop an API endpoint for checking the status of a running job.
*   Update the frontend to use the new APIs.

### Out of Scope

*   **Authentication:** The initial version of the APIs will not have authentication.
*   **User-Facing Error Messages:** The initial version will only log errors to the server/browser console.
*   **New UI Features:** No new UI features will be added as part of this project.

## 5. API Specifications

### 5.1. API Endpoint: IFC to Fragments Conversion

*   **Endpoint:** `POST /api/v1/fragments`
*   **Request:** `multipart/form-data` with a single field `ifcFile` containing the IFC file.
*   **Response (Success):**
    *   **Status Code:** `202 Accepted`
    *   **Body:**
        ```json
        {
          "jobId": "<unique-job-id>"
        }
        ```

### 5.2. API Endpoint: IDS Check

*   **Endpoint:** `POST /api/v1/ids/check`
*   **Request:** `multipart/form-data` with two fields:
    *   `ifcFile`: The IFC file to validate.
    *   `idsFile`: The IDS XML file containing validation requirements.
*   **Response (Success):**
    *   **Status Code:** `202 Accepted`
    *   **Body:**
        ```json
        {
          "jobId": "<unique-job-id>"
        }
        ```

### 5.3. API Endpoint: Job Status

*   **Endpoint:** `GET /api/v1/jobs/:jobId`
*   **Response:**
    *   **Status Code:** `200 OK`
    *   **Body (In Progress):**
        ```json
        {
          "status": "in-progress",
          "progress": 50
        }
        ```
    *   **Body (Completed - Fragments):**
        ```json
        {
          "status": "completed",
          "result": {
            "fragmentsUrl": "/api/v1/fragments/<unique-file-id>"
          }
        }
        ```
    *   **Body (Completed - IDS Check):**
        ```json
        {
          "status": "completed",
          "result": {
            "validationResults": { ... }
          }
        }
        ```
    *   **Body (Failed):**
        ```json
        {
          "status": "failed",
          "error": "<error-message>"
        }
        ```

### 5.4. API Endpoint: Download Fragments

*   **Endpoint:** `GET /api/v1/fragments/:fileId`
*   **Response:** The fragments file.

## 6. Technical Requirements

*   **Backend Framework:** Express.js
*   **Core Processing Library:** `@thatopen/components` (Note: not `@thatopen/components-front`)
*   **Node.js Environment:**
    *   Polyfills for `fetch` (using `node-fetch`) and `document` (using `jsdom`) will be required.
    *   The `web-ifc.wasm` module will need to be accessible by the backend service.
*   **Deployment:** The backend service will be containerized using Docker and deployed alongside the frontend.

### 6.1. Job Management

For the initial implementation, a simple in-memory job queue will be used to track the status of asynchronous jobs.

*   **Job Store:** A `Map` object in the Express.js application will store job information, with the `jobId` as the key.
*   **Persistence:** This approach is not persistent. Job information will be lost if the server restarts. For future production use, a more robust solution like a database-backed queue (e.g., using SQLite or Redis) will be necessary.

## 7. Assumptions and Dependencies

*   The `@thatopen/components` library, with the help of polyfills, can be successfully run in a Node.js environment.
*   The backend service will have access to the `web-ifc` WASM module and the fragments worker.

## 8. Risks and Mitigation

*   **Risk:** The `@thatopen/components` library has unexpected browser-specific dependencies that are difficult to polyfill.
*   **Mitigation:** The initial phase of the project will focus on creating a proof-of-concept to validate the headless approach. If significant issues are encountered, we will re-evaluate the technical approach.
*   **Risk:** Large file uploads and processing times could lead to performance issues.
*   **Mitigation:** Implement streaming for file uploads and processing. Use a robust job queue to manage long-running tasks.
*   **Risk:** The in-memory job queue is not persistent, leading to data loss on server restart.
*   **Mitigation:** For the initial phase, this is an accepted trade-off. For production, this will be replaced with a persistent solution like a database-backed queue (e.g., SQLite or Redis).

## 9. Success Metrics

*   The backend APIs are successfully implemented and integrated with the frontend.
*   The application's performance is not degraded by the introduction of the backend service.
*   The backend service is scalable and can handle large IFC files.
