# Product Requirements Document: Todo-CLI

**1. Introduction**

This document outlines the requirements for Todo-CLI, a terminal-based task management application. The goal is to create a lightweight, fast, and intuitive tool for developers and command-line users to manage their daily tasks without leaving the terminal. The user experience should feel modern and responsive, similar to contemporary developer tools.

**2. Vision & Goals**

*   **Vision:** To be the fastest and most intuitive way to manage to-do lists from the command line.
*   **Primary Goal:** Create a beautiful and functional interactive terminal interface for daily task management.
*   **Secondary Goals:**
    *   Provide simple, non-interactive commands for quick task additions and viewing.
    *   Ensure data is stored in a simple, human-readable format.
    *   Prioritize keyboard-based interactions for efficiency.

**3. User Personas**

*   **Primary Persona:** Software developers, DevOps engineers, and system administrators who spend most of their day in the terminal. They value speed, efficiency, and keyboard-driven workflows.

**4. Feature Requirements**

**MVP (Minimum Viable Product)**

| Feature ID | Feature Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| F-01 | Interactive UI | A full-screen interactive view built with Ink. This is the core of the application. | Must-have |
| F-02 | Date Navigation | In the interactive UI, users can switch between dates using the left and right arrow keys. | Must-have |
| F-03 | Task Display | Tasks for the selected date are displayed in a list. Each task shows a checkbox, its description, and status. | Must-have |
| F-04 | Task State Toggle | Users can select a task (using up/down arrow keys) and toggle its completion status (done/undone) using the spacebar. | Must-have |
| F-05 | Add Task (Quick) | A command `todo add "My new task"` adds a task to the list for the current day. | Must-have |
| F-06 | Data Storage | Tasks are stored in a local JSON file (`~/.todo-cli/tasks.json`). | Must-have |
| F-07 | View Today's List | Running `todo` with no arguments opens the interactive UI for the current date. | Must-have |

**Post-MVP Features**

| Feature ID | Feature Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| F-08 | Add Task to Date | `todo add "My task" --date <date>` adds a task to a specific date. | High |
| F-09 | Delete Task | In the interactive UI, users can delete the selected task with the 'd' key. | High |
| F-10 | List View (Non-interactive) | `todo list` and `todo list <date>` print a simple, non-interactive list of tasks to the console. | Medium |
| F-11 | Edit Task | In the interactive UI, users can edit the selected task's description with the 'e' key. | Medium |
| F-12 | Task Priorities | Assign priority levels (e.g., High, Normal, Low) to tasks, visualized with colors. | Low |
| F-13 | Help Command | A `todo --help` command that displays usage information for all commands. | Medium |

**5. Technical Requirements**

*   **Platform:** Node.js
*   **CLI Parsing:** Yargs
*   **Interactive UI:** Ink (React)
*   **Styling:** Chalk
*   **Data Format:** JSON

**6. Design & UX**

*   The UI should be clean, minimalist, and responsive to terminal resizing.
*   Color should be used purposefully to convey information (e.g., task status, priority).
*   Keyboard shortcuts should be intuitive and clearly documented.
*   Feedback for actions (e.g., adding, deleting a task) should be immediate and clear.

**7. Out of Scope (for now)**

*   Cloud synchronization
*   Sub-tasks
*   Recurring tasks
*   GUI (non-terminal) version
