## Product Requirements Document: Model Context Protocol (MCP) Server

**Document Version:** 1.0
**Date:** July 23, 2025
**Author:** Gemini CLI Agent

---

### 1. Introduction

This document outlines the requirements for a new Model Context Protocol (MCP) server for the existing Node.js To-Do application. The primary purpose of this server is to provide Large Language Models (LLMs) with structured, real-time contextual information about a user's to-do list. This will enable LLMs to answer user queries, summarize task states, and provide insights based on the user's current data, without directly modifying the data.

### 2. Goals

*   **Enable LLM Contextual Understanding:** Provide LLMs with a reliable and structured API to query the state of a user's to-do list.
*   **Ensure Strict Data Isolation:** Guarantee that an LLM, acting on behalf of a specific user, can *only* access that user's data and no other user's information.
*   **Leverage Existing Business Logic:** Reuse the existing `src/task-list.ts` and `src/supabase.ts` modules for data retrieval to maintain consistency and reduce code duplication.
*   **Provide Structured Responses:** Deliver data in a machine-readable format (JSON) that LLMs can easily parse and interpret.
*   **Facilitate LLM Integration:** Offer a clear, self-describing API specification (OpenAPI) to simplify LLM tool integration.

### 3. Non-Goals

*   **Direct Task Modification by LLM:** This server is strictly for *reading* contextual data. LLMs will not be able to add, update, or delete tasks via this API.
*   **Replacement of CLI:** The existing CLI will continue to function independently. The MCP server is an additional interface.
*   **User Interface:** This server will not have a graphical user interface. It is a backend API.
*   **Complex Business Logic:** The server will primarily expose existing data retrieval logic; it will not introduce new complex business rules.

### 4. Target Audience

*   **Large Language Models (LLMs):** The primary consumers of the API endpoints.
*   **Developers Integrating LLMs:** Those who will configure LLMs to use this context server as a tool.

### 5. Key Features & Functionality

#### 5.1. API Endpoints (Context Queries)

The server will expose read-only HTTP GET endpoints to provide specific slices of user task information. All responses will be in JSON format.

*   **`GET /context/tasks/all`**
    *   **Description:** Retrieves all tasks (complete and incomplete) for the authenticated user.
    *   **Response:** `Array<TaskObject>` (e.g., `[{ id: '...', description: '...', completed: true, dueDate: '...' }]`)
*   **`GET /context/tasks/incomplete`**
    *   **Description:** Retrieves all incomplete tasks for the authenticated user.
    *   **Response:** `Array<TaskObject>`
*   **`GET /context/tasks/complete`**
    *   **Description:** Retrieves all completed tasks for the authenticated user.
    *   **Response:** `Array<TaskObject>`
*   **`GET /context/tasks/due-today`**
    *   **Description:** Retrieves tasks for the authenticated user that are due on the current day.
    *   **Response:** `Array<TaskObject>`
*   **`GET /context/tasks/search?query={keyword}`**
    *   **Description:** Searches tasks by description for a given keyword for the authenticated user.
    *   **Parameters:** `query` (string, required) - The keyword to search for.
    *   **Response:** `Array<TaskObject>`
*   **`GET /context/tasks/{taskId}`**
    *   **Description:** Retrieves detailed information for a specific task by its ID for the authenticated user.
    *   **Parameters:** `taskId` (string, required) - The unique ID of the task.
    *   **Response:** `TaskObject` or `404 Not Found` if task does not exist or does not belong to the user.

#### 5.2. Authentication

*   **API Key Based:** Authentication will be performed using unique API keys.
*   **HTTP Header:** API keys will be passed in the `Authorization` header using the `Bearer` scheme (e.g., `Authorization: Bearer sk_user_123abc...`).
*   **User Association:** Each API key will be securely linked to a single `user_id` in the Supabase `users` table.

#### 5.3. Data Isolation

*   **Strict User Scope:** The server *must* ensure that all data returned belongs exclusively to the authenticated user associated with the provided API key. No cross-user data access is permitted.

#### 5.4. Structured Responses

*   All API responses will be JSON objects or arrays of JSON objects, providing clear and consistent data structures for LLM consumption.

#### 5.5. OpenAPI Specification

*   The API will be documented using an OpenAPI (Swagger) specification. This `openapi.json` file will formally describe all endpoints, parameters, response schemas, and authentication methods, allowing LLMs to automatically discover and understand the API's capabilities.

### 6. Technical Design & Architecture

#### 6.1. High-Level Architecture

The MCP Context Server will be a new HTTP server running alongside the existing application. It will be built using Node.js and a lightweight web framework (e.g., Express.js or Fastify).

```
+-------------------+       +-------------------+       +-------------------+
| LLM / Integrator  | <---> | MCP Context Server| <---> | Existing App Logic|
| (API Key)         |       | (Node.js/Express) |       | (src/task-list.ts)|
+-------------------+       +-------------------+       +-------------------+
                                      |
                                      V
                               +-------------------+
                               | Supabase Database |
                               +-------------------+
```

#### 6.2. Core Components

*   **`src/mcp-context-server.ts` (New):** The main entry point for the server. Initializes the web framework, applies middleware, defines routes, and starts listening on a designated port (e.g., 3001).
*   **`src/api/middleware.ts` (New):** Contains the authentication middleware responsible for:
    1.  Extracting the API key from the `Authorization` header.
    2.  Validating the API key against the `users` table in Supabase.
    3.  Retrieving the associated `user_id`.
    4.  Attaching the `user_id` to the request object (e.g., `req.user.id`).
    5.  Returning `401 Unauthorized` for invalid or missing API keys.
*   **`src/api/context-routes.ts` (New):** Defines the specific API routes and their corresponding handler functions. Each handler will:
    1.  Access the `user_id` from the request object (provided by middleware).
    2.  Call the appropriate function from `src/task-list.ts` (e.g., `getTasks(req.user.id)`).
    3.  Format the returned data as JSON and send the HTTP response.
*   **`src/task-list.ts` (Existing/Modified):** Will be modified to ensure all data retrieval functions accept a `userId` parameter and filter queries by this ID. Functions should return raw data structures (e.g., arrays of task objects) suitable for JSON serialization.
*   **`src/supabase.ts` (Existing):** Used for interacting with the Supabase database.

#### 6.3. Data Flow

1.  LLM sends an HTTP GET request to an MCP endpoint (e.g., `/context/tasks/incomplete`) with an API key in the `Authorization` header.
2.  The request hits the MCP Context Server.
3.  The authentication middleware intercepts the request, validates the API key, and identifies the `user_id`. If authentication fails, `401 Unauthorized` is returned.
4.  The request proceeds to the relevant route handler.
5.  The route handler calls a function in `src/task-list.ts`, passing the authenticated `user_id`.
6.  `src/task-list.ts` constructs a Supabase query that *explicitly includes a `WHERE user_id = authenticated_user_id` clause*.
7.  Supabase executes the query, with **Row-Level Security (RLS)** acting as a final safeguard, ensuring only rows belonging to the authenticated user are returned.
8.  The data is returned to `src/task-list.ts`, then to the route handler.
9.  The route handler formats the data as JSON and sends it back as the HTTP response to the LLM.

### 7. Data Model Considerations

*   **`users` table:** A new column, `api_key` (e.g., `VARCHAR(255)`, `UNIQUE`, `NOT NULL`), will be added to store the unique API key for each user. This key will be generated and managed securely.
*   **`tasks` table:** Must contain a `user_id` column (e.g., `UUID`, `NOT NULL`, foreign key to `users.id`) to link tasks to their respective owners.

### 8. Security Considerations

*   **API Key Management:**
    *   API keys must be securely generated (e.g., cryptographically strong random strings).
    *   API keys should be stored securely (e.g., hashed in the database, or if stored directly, with strict access controls).
    *   Users should be able to revoke and regenerate their API keys.
*   **Strict Application-Level Filtering:** Every database query initiated by the MCP server *must* include a `WHERE user_id = authenticated_user_id` clause. This is a critical application-level enforcement.
*   **Supabase Row-Level Security (RLS) - CRITICAL:**
    *   RLS *must* be enabled on the `tasks` table (and any other user-specific tables).
    *   A robust RLS policy *must* be implemented for `SELECT` operations on the `tasks` table, ensuring that `auth.uid() = user_id`. This provides a database-level guarantee that users can only access their own data, even if application-level filtering is somehow bypassed or misconfigured.
*   **Input Validation:** All incoming query parameters (e.g., `query` for search, `taskId`) will be validated using a library like Zod to prevent injection attacks and ensure data integrity.
*   **Error Handling:** API errors (e.g., invalid API key, task not found, internal server errors) will return appropriate HTTP status codes and generic error messages to avoid leaking sensitive information.
*   **CORS:** Proper Cross-Origin Resource Sharing (CORS) policies will be implemented to restrict access to authorized origins.
*   **Rate Limiting (Future Consideration):** Implement rate limiting to prevent abuse and denial-of-service attacks.

### 9. Future Considerations (Phase 2)

*   **More Complex Queries:** Support for filtering tasks by multiple criteria (e.g., due date range, tags, priority).
*   **Webhooks/Real-time Updates:** Potentially expose a mechanism for LLMs to subscribe to real-time updates on task changes (e.g., via WebSockets or Supabase Realtime).
*   **Caching:** Implement caching strategies for frequently accessed data to improve performance and reduce database load.
*   **Semantic Search:** Integrate more advanced search capabilities beyond simple keyword matching.

### 10. Success Metrics

*   **Successful LLM Integration:** LLMs are able to consistently and accurately retrieve user task context.
*   **Zero Data Leakage:** No instances of cross-user data access are observed or reported.
*   **API Uptime & Performance:** The MCP server maintains high availability and responds to queries within acceptable latency thresholds.
*   **Developer Feedback:** Positive feedback from developers integrating LLMs regarding the clarity and usability of the API and its documentation.
