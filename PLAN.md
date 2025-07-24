# Project Plan: Todo-CLI

**1. Core Functionality**

*   **Date-Based Organization:** Tasks are grouped by date. Running the app defaults to today's list.
*   **Task Management:**
    *   Add new tasks to a specific date.
    *   View all tasks for a given date.
*   **Interactive Mode:**
    *   A full-screen terminal UI to view and interact with tasks.
    *   Navigate between dates (e.g., with arrow keys).
    *   Toggle tasks between "done" and "undone" (e.g., with the spacebar).
    *   Quit the application (e.g., with 'q' or Ctrl+C).

**2. Proposed Additional Features**

*   **Simple Command-Line Interface (CLI):**
    *   `todo` or `todo today`: Open the interactive view for today's date.
    *   `todo <date>`: Open the interactive view for a specific date (e.g., `todo 2025-07-24`, `todo tomorrow`).
    *   `todo add "My new task"`: Quickly add a task for today.
    *   `todo add "My new task" --date <date>`: Add a task for a specific date.
    *   `todo list`: Display a simple, non-interactive list of today's tasks.
    *   `todo list <date>`: Display a list for a specific date.

*   **Task Actions (in Interactive Mode):**
    *   **Edit:** Select a task and press a key (e.g., 'e') to edit its description.
    *   **Delete:** Select a task and press a key (e.g., 'd') to delete it.
    *   **Priority:** Assign a priority level (e.g., High, Normal, Low) to a task, visually indicated by color.

*   **Data Storage:**
    *   Tasks will be stored in a simple JSON file (e.g., `~/.todo-cli/tasks.json`). This makes it easy to view, edit, or back up your data manually if needed.

*   **Usability & Appearance:**
    *   Use colors to indicate task status (e.g., green for done, white for undone) and priority.
    *   A clear help menu (`todo --help`) explaining all commands and keyboard shortcuts.

**3. Technology Stack**

*   **Language:** Node.js
*   **UI Framework:** **Ink** for the main interactive view (`todo`).
*   **Command Parsing:** **Yargs** to define and manage your CLI commands (`add`, `list`, etc.).
*   **Interactive Prompts:** **Enquirer** for polished, interactive prompts.
*   **Styling:** `chalk` for adding color to the output.
