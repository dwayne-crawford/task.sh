# TASK.SH - Todo CLI

A powerful command-line todo application built with Node.js, TypeScript, and Ink. Manage your daily tasks with an interactive UI or command-line interface, featuring project organization, subtasks, cloud sync, and complete feature parity between CLI and interactive modes.

## Features

- **Interactive UI**: Beautiful terminal interface with TASK.SH branding
- **Slash Commands**: Full CLI functionality available in interactive mode
- **Cloud Sync**: Optional Supabase authentication for cross-device sync
- **Offline First**: Works perfectly offline, syncs when connected
- **Project Organization**: Organize tasks using `#project` tags
- **Subtasks**: Break down complex tasks with expandable subtasks
- **Date Navigation**: Navigate between dates with arrow keys
- **Complete Feature Parity**: Every CLI command available as slash command
- **Smart Authentication**: Optional login via `/login` command
- **Data Persistence**: Separate local and cloud storage

## Quick Start

### Installation
```bash
# Clone the repository
cd todo-cli

# Install dependencies
npm install

# Build the project
npm run build

# Start using TASK.SH
npm start
```

### First Launch
The app launches directly into the main interface - no forced authentication:
```bash
npm start
```

You'll see the TASK.SH banner and can immediately start using tasks offline. Use `/login` when ready for cloud sync.

## Interactive Mode Commands

### Navigation & Selection
| Key | Action |
|-----|--------|
| ← → | Navigate dates |
| ↑ ↓ | Select task/subtask |
| Space | Toggle completion |
| Tab | Expand/collapse subtasks |
| Esc | Quit application |

### Task Management
| Key | Action |
|-----|--------|
| n | Add simple task |
| N | Add task with subtasks |
| e | Edit selected task |
| d | Delete selected task/subtask |
| i | Toggle task ID display |

### Slash Commands (Interactive Mode)
All CLI functionality is available via slash commands in interactive mode:

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show comprehensive help | `/help` |
| `/login` | Open login screen | `/login` |
| `/logout` | Sign out from account | `/logout` |
| `/add [task] [--date YYYY-MM-DD]` | Add task or open dialog | `/add Fix bug #work --date 2025-07-25` |
| `/delete [id]` | Delete selected or by ID | `/delete abc123` |
| `/edit [id] [desc]` | Edit selected or by ID | `/edit abc123 New description` |
| `/list` | Advanced list view with filters | `/list` |
| `/calendar` | Calendar view with date range | `/calendar` |
| `/projects` | Show all projects | `/projects` |
| `/sync` | Sync with cloud | `/sync` |
| `/ids` | Toggle task ID display | `/ids` |

**Smart Command Behavior:**
- Commands without arguments use current selection
- Commands with arguments work directly with IDs
- Flexible usage for both quick actions and precise control

### Advanced Interactive Features

#### `/list` - Enhanced List View
Access the powerful list filtering system used in CLI mode:
- **Toggle all dates**: `a` - Switch between single date and all dates view
- **Navigate dates**: `← →` - Move between dates (single date mode)
- **Filter by project**: `p` - Cycle through projects
- **Filter by completion**: `c` - Cycle through all/completed/pending
- **Toggle task IDs**: `i` - Show/hide task IDs for editing/deleting
- **Exit**: `q` or `Esc`

#### `/calendar` - Interactive Calendar View  
Full-featured calendar with the same options as CLI:
- **Adjust days**: `+/-` - Increase/decrease number of days shown (1-30)
- **Filter by project**: `p` - Cycle through project filters
- **Toggle task IDs**: `i` - Show/hide task IDs
- **Exit**: `q` or `Esc`

#### Task ID Management
- **Main view**: Press `i` or use `/ids` to toggle task ID display
- **Advanced views**: Both `/list` and `/calendar` have built-in ID toggle
- **IDs show first 8 characters** for delete/edit operations

## CLI Commands

### Core Commands

#### `add <task>`
Add a new todo task.
```bash
todo add "Review pull requests"
todo add "Team meeting" --date 2025-07-25
todo add "Setup project #work"
```

**Options:**
- `--date, -d`: Specify date (YYYY-MM-DD)

#### `list [date]`
List tasks with powerful filtering options.
```bash
# List today's tasks
todo list

# List specific date
todo list 2025-07-25

# List all tasks from all dates
todo list --all

# Filter by project
todo list --project work

# Show only completed tasks
todo list --completed

# Show only pending tasks
todo list --pending

# Show task IDs for delete/edit operations
todo list --ids

# Combine filters
todo list --all --project work --completed --ids
```

**Options:**
- `--all, -a`: Show tasks from all dates
- `--project, -p`: Filter by project name (without #)
- `--completed, -c`: Show only completed tasks
- `--pending`: Show only pending tasks
- `--ids`: Show task IDs (useful for delete/edit commands)

#### `calendar [days]`
Display tasks in calendar view.
```bash
# Show next 7 days
todo calendar

# Show next 14 days
todo calendar 14

# Filter by project
todo calendar --project work
todo calendar 30 --project docs

# Show task IDs
todo calendar --ids
```

**Options:**
- `days`: Number of days to show (default: 7)
- `--project, -p`: Filter by project name
- `--ids`: Show task IDs (useful for delete/edit commands)

#### `projects`
List all projects with completion statistics.
```bash
todo projects
```

Example output:
```
Projects:
  #work (3/5 completed)
  #personal (1/2 completed)
  #docs (2/3 completed)
```

#### `edit <id> <newDescription>`
Edit a task's description by ID.
```bash
todo edit abc123 "Updated task description"
```

#### `delete <id>`
Delete a task by ID.
```bash
todo delete abc123
```

#### `sync`
Manually sync tasks with cloud (requires authentication).
```bash
todo sync
```

#### `logout`
Sign out from account.
```bash
todo logout
```

### Help
Get help for any command:
```bash
todo --help
todo list --help
todo calendar --help
```

## Project Organization

### Using Project Tags
Add `#projectname` anywhere in the task description:

```bash
todo add "Fix navigation bug #website"
todo add "Update documentation #docs"
todo add "Buy groceries #personal"
```

Projects appear as blue tags and enable powerful filtering:
```bash
# CLI filtering
todo list --project website
todo calendar --project docs

# Interactive slash commands
/add Review designs #website
/projects
```

### Project Benefits
- **Visual Organization**: Blue project tags in all views
- **Powerful Filtering**: Filter by project in all commands
- **Progress Tracking**: See completion stats with `/projects`
- **Cross-Mode Consistency**: Works identically in CLI and interactive

## Subtasks

### Creating Subtasks (Interactive Mode)
1. Press **N** (Shift+N) to start multiline input
2. Enter your main task description
3. Press **Ctrl+J** for new lines
4. Start subtask lines with `- `

Example:
```
Setup development environment #work
- Install Node.js and npm
- Clone repository from GitHub
- Install project dependencies
- Configure IDE settings
- Setup environment variables
```

### Managing Subtasks
- **Tab**: Expand/collapse subtasks when task is selected
- **Space**: Toggle individual subtask completion
- **↑ ↓**: Navigate between subtasks
- **d**: Delete individual subtasks
- **Progress Display**: Shows `(2/4)` completion in task list

## Cloud Sync & Authentication

### Authentication Flow
TASK.SH uses optional authentication - you can use it offline or with cloud sync:

**Offline Mode (Default):**
- Launch app → Start using immediately
- Tasks stored locally in `data/tasks.json`
- No internet required

**Cloud Sync Mode:**
- Type `/login` in interactive mode
- Choose "Sign in with password" or "Create new account"
- Tasks automatically sync across devices
- Offline support with automatic sync when reconnected

### Cloud Setup (Optional)
1. Create a Supabase account and project
2. Run the database schema from `supabase-schema.sql`
3. Create `.env` file with your Supabase credentials:
```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

### Authentication Commands
```bash
# Interactive mode
/login          # Open login screen
/logout         # Sign out
/sync           # Manual sync

# CLI mode
todo logout
todo sync
```

### Storage Separation
- **Local tasks**: Stored in `data/tasks.json`
- **Cloud tasks**: Stored in `data/cloud-tasks.json` + Supabase
- **Complete isolation**: Local and cloud tasks never mix
- **User isolation**: Each authenticated user sees only their tasks

## Feature Parity Matrix

Every feature works identically across all usage modes:

| Feature | CLI Command | Interactive Key | Interactive Slash | Status |
|---------|-------------|-----------------|-------------------|---------|
| Add task | `add "task"` | `n` | `/add task` | ✅ |
| Add with date | `add "task" --date` | - | `/add task --date YYYY-MM-DD` | ✅ |
| Add with subtasks | - | `N` | `/add` (dialog) | ✅ |
| Edit task | `edit <id> <desc>` | `e` | `/edit [id] [desc]` | ✅ |
| Delete task | `delete <id>` | `d` | `/delete [id]` | ✅ |
| List tasks | `list [options]` | Default view | `/list` (advanced filters) | ✅ |
| List with filters | `list --all --project --completed --pending --ids` | - | `/list` (interactive filters) | ✅ |
| Calendar view | `calendar [days] --project --ids` | - | `/calendar` (interactive controls) | ✅ |
| View projects | `projects` | - | `/projects` | ✅ |
| Show task IDs | `list --ids` `calendar --ids` | `i` | `/ids` | ✅ |
| Sync cloud | `sync` | - | `/sync` | ✅ |
| Authentication | `logout` | - | `/login` `/logout` | ✅ |
| Help | `--help` | - | `/help` | ✅ |

**Complete Feature Parity Achieved!** ✅ All CLI functionality is now available in Interactive mode with equivalent or enhanced capabilities.

## Daily Workflows

### Quick Task Management
```bash
# Morning routine
todo list                    # Check today's tasks
todo add "Review PRs #work"  # Add urgent task
todo                         # Interactive mode for detailed work

# During the day (interactive mode)
/add Call client #sales
/projects                         # Check project status
/sync                            # Manual sync if needed
```

### Project Planning
```bash
# Weekly project review
todo projects                          # See all project stats
todo calendar 7 --project work        # Week view for work
todo list --all --project work --pending  # All pending work tasks

# Interactive project work
/add Setup new feature #webapp
# Press N for subtasks:
# Setup new feature #webapp
# - Design database schema
# - Create API endpoints
# - Build frontend components
# - Write tests
```

### Multi-Device Workflow
```bash
# Device 1: Add tasks
/login                           # Authenticate
/add "Prepare presentation #work"
/logout                          # Sign out

# Device 2: Access anywhere
/login                           # Same account
# See tasks from Device 1 automatically
/add "Print handouts #work"      # Add more tasks
```

### Review and Reporting
```bash
# What did I complete today?
todo list --completed

# What's pending across all projects?
todo list --all --pending

# How are my projects doing?
todo projects

# Interactive review
/projects                        # Quick project overview
/help                           # Remember all commands
```

## Advanced Examples

### Complex Project Setup
```bash
# Create comprehensive project task
todo
N    # Add with subtasks
```
Then type:
```
Launch mobile app #startup
- Market research and competitor analysis
- Design user interface mockups
- Setup development environment
- Implement core features
- Write comprehensive tests
- Deploy to app stores
- Marketing campaign planning
```

### Filtering Mastery
```bash
# Show all completed work tasks across all time
todo list --all --project work --completed

# See this week's personal calendar
todo calendar 7 --project personal

# Review what's pending for documentation project
todo list --all --project docs --pending

# Get task IDs for editing/deleting
todo list --all --ids
```

### Cross-Mode Usage
```bash
# Add via CLI
todo add "Client meeting tomorrow #sales" --date 2025-07-25

# Switch to interactive for detailed management
todo
# Navigate to tomorrow's date with → key
# Use Tab to expand subtasks, Space to complete items

# Use slash commands for quick actions
/add Follow up email #sales
/projects
/sync
```

## Help System

### Getting Help
- **CLI**: `todo --help` or `todo <command> --help`
- **Interactive**: `/help` for comprehensive command reference
- **Contextual**: Bottom right shows "/help for more information"

### Help Screens
The `/help` command shows complete documentation:
- Interactive mode controls
- All slash commands with examples
- CLI commands and flags
- Project organization tips
- Subtask creation guide
- Authentication workflow

## Data and Storage

### File Structure
```
todo-cli/
├── src/                 # TypeScript source
├── dist/                # Compiled JavaScript
├── data/
│   ├── tasks.json       # Local/offline tasks
│   ├── cloud-tasks.json # Authenticated user tasks
│   └── offline-changes.json # Sync queue
├── .env                 # Supabase credentials (optional)
└── README.md
```

### Task Data Format
```json
{
  "id": "unique-id",
  "description": "Task description #project",
  "completed": false,
  "date": "2025-07-24",
  "project": "project",
  "subtasks": [
    {
      "id": "subtask-id", 
      "description": "Subtask description",
      "completed": true
    }
  ],
  "isExpanded": false
}
```

## Troubleshooting

### Common Issues

**App won't start:**
```bash
npm install
npm run build
todo
```

**Can't see tasks after login:**
- Tasks are stored separately for each auth state
- Local tasks (offline) vs Cloud tasks (authenticated) are isolated
- This is intentional for data security

**Slash commands not working:**
- Type `/` to enter command mode
- Use Return to execute, Esc to cancel
- Commands are case-sensitive

**Authentication issues:**
- Ensure `.env` file has correct Supabase credentials
- Check network connection for cloud features
- Use offline mode if cloud sync not needed

### Performance Tips
- Use project tags consistently for better filtering
- Review and complete old tasks regularly
- Use subtasks to break down complex work
- Leverage both CLI and interactive modes for optimal workflow

## Contributing

TASK.SH is built with modern TypeScript and React (Ink). Key technologies:
- **Ink**: React for CLI interfaces
- **Yargs**: Command-line argument parsing  
- **Supabase**: Optional cloud backend
- **TypeScript**: Type-safe development

## License

MIT License - feel free to use and modify for your needs.

---

**TASK.SH**: Complete todo management with total CLI-Interactive feature parity. Work your way! 🎯