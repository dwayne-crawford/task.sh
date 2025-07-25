# TASK.SH - Todo CLI + MCP Server

A comprehensive task management system built with Node.js, TypeScript, and Ink. Features a powerful CLI/interactive interface plus an integrated Model Context Protocol (MCP) server for AI assistant integration.

## 🚀 Key Features

### Core Task Management
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

### 🤖 MCP Server Integration
- **AI Assistant Access**: Claude Code, Cursor IDE, GitHub Copilot, ChatGPT integration
- **Read-Only Security**: Safe data access for AI tools without modification risks
- **API Key Management**: Secure authentication with expiration controls
- **Multiple Export Formats**: JSON, CSV, Markdown, Excel export capabilities
- **Real-Time Context**: AI assistants get live task data and productivity insights
- **Cross-Platform Support**: Works with any HTTP-compatible AI tool

## Installation

### Global Installation (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd todo-cli

# Install dependencies and build
npm install
npm run build

# Install globally to use 'todo' command anywhere
npm run install:global

# Now you can use 'todo' from any directory!
todo --help
```

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd todo-cli

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
npm start
```

### Uninstall
```bash
# Remove global installation
npm run uninstall:global
```

### First Launch
The app launches directly into the main interface - no forced authentication:
```bash
todo
```

You'll see the TASK.SH banner and can immediately start using tasks offline. Use `/login` when ready for cloud sync.

### Quick Commands
```bash
# Interactive mode
todo

# Add a task quickly
todo add "Review pull requests #work"

# List today's tasks
todo list

# Show calendar view
todo calendar

# Start MCP server for AI integration
npm run dev:mcp

# Generate API key for AI tools
todo api generate-key "Claude Integration"

# Get help
todo --help
```

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
| `/api` | API key management interface | `/api` |

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

#### `/api` - API Key Management Interface
Complete API key management for MCP server integration:
- **Generate keys**: `g` - Create new API keys with custom expiration
- **Copy to clipboard**: `c` - Automatically copy generated keys
- **Navigate keys**: `↑ ↓` - Browse existing keys
- **Revoke keys**: `r` or `Delete` - Remove access for selected keys
- **Refresh list**: `R` - Update key list and status
- **Key details**: View expiration, usage stats, and security info
- **Exit**: `Esc` - Return to main interface

## 🤖 MCP Server Integration

The Task.sh MCP Server provides **read-only** access to your task data for AI assistants like Claude Code, Cursor IDE, GitHub Copilot, and ChatGPT. This enables powerful AI-powered task analysis, productivity insights, and data export capabilities.

### 🔑 API Key Management

#### Interactive UI Method (Recommended)
```bash
# Launch interactive mode
todo

# Open API management interface
/api

# Generate new key:
# - Press 'g' to generate
# - Press 'n' to enter name
# - Select expiration (30/90/365 days or never)
# - Press 'c' to copy key to clipboard
```

#### CLI Method
```bash
# Generate with default 90-day expiration
todo api generate-key "My MCP Key"

# Custom expiration options
todo api generate-key "Claude Desktop" --expires 30
todo api generate-key "Long Term Integration" --expires 365
todo api generate-key "Development Key" --expires never

# View all your keys
todo api list-keys

# Revoke a key
todo api revoke-key [keyId]

# Get integration help
todo api info
```

### 🖥️ Starting the MCP Server

```bash
# Development mode (auto-rebuilds)
npm run dev:mcp

# Production mode
npm run start:mcp

# Run both API and MCP servers
npm run dev:all
```

**Expected output:**
```
🤖 Task.sh MCP Server running on port 3002
📋 Environment: development
🔗 Health check: http://localhost:3002/health
🚀 MCP Server ready for LLM integration!
```

### 📊 Available API Endpoints

#### Context Queries (GET requests)
| Endpoint | Description | AI Use Case |
|----------|-------------|-------------|
| `/context/tasks/all` | All tasks with summary | "Show me all my tasks" |
| `/context/tasks/incomplete` | Pending tasks only | "What needs to be done?" |
| `/context/tasks/complete` | Completed tasks | "What did I accomplish?" |
| `/context/tasks/due-today` | Today's tasks | "What's due today?" |
| `/context/tasks/search?query=X` | Search tasks | "Find tasks about 'meeting'" |
| `/context/tasks/:id` | Specific task | "Details on task abc123" |
| `/context/projects` | Project summary | "Show project status" |
| `/context/stats` | Productivity stats | "Analyze my productivity" |

#### Export Tools (POST requests)
| Endpoint | Purpose | Formats |
|----------|---------|---------|
| `/tools/export/status` | Export by status | JSON, CSV, Markdown, Excel |
| `/tools/export/project` | Export by project | JSON, CSV, Markdown, Excel |
| `/tools/export/date-range` | Export date range | JSON, CSV, Markdown, Excel |
| `/tools/export/bulk` | Export everything | JSON, CSV, Markdown, Excel |

### 🛠️ AI Platform Integration

#### Claude Code (Anthropic)
```bash
# Direct HTTP access - no configuration required
# Base URL: http://localhost:3002
# Authentication: Bearer sk_user_YOUR_API_KEY

# Example usage:
"Using my task.sh MCP server at localhost:3002 with API key sk_user_ABC123..., 
show me my incomplete tasks"
```

#### Claude Desktop
Add to `~/.anthropic/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "tasksh": {
      "command": "node",
      "args": ["/absolute/path/to/your/todo-cli/dist/mcp-start.js"],
      "env": {
        "MCP_PORT": "3002",
        "API_KEY": "sk_user_YOUR_API_KEY"
      }
    }
  }
}
```

#### Cursor IDE
```json
{
  "cursor.ai.mcpServers": {
    "tasksh": {
      "name": "Task.sh MCP Server",
      "url": "http://localhost:3002",
      "authentication": {
        "type": "bearer",
        "token": "sk_user_YOUR_API_KEY"
      },
      "capabilities": ["context", "export"]
    }
  }
}
```

#### GitHub Copilot (VS Code)
```json
{
  "github.copilot.mcp.servers": {
    "tasksh": {
      "url": "http://localhost:3002",
      "headers": {
        "Authorization": "Bearer sk_user_YOUR_API_KEY"
      }
    }
  }
}
```

### 🧪 Testing Integration

```bash
# Test server health
curl http://localhost:3002/health

# Test authentication
curl "http://localhost:3002/context/tasks/all" \
  -H "Authorization: Bearer sk_user_YOUR_API_KEY"

# Test export functionality
curl -X POST "http://localhost:3002/tools/export/status" \
  -H "Authorization: Bearer sk_user_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "incomplete", "format": "markdown"}'
```

### 🎯 AI Use Cases

Once integrated, your AI assistant can:

**Task Analysis:**
- "What are my incomplete tasks and their priorities?"
- "Analyze my productivity patterns over the last week"
- "Which projects need the most attention?"

**Data Export:**
- "Export my work project tasks as a markdown report"
- "Generate a CSV of all completed tasks this month"
- "Create an Excel spreadsheet of overdue items"

**Productivity Insights:**
- "Show me my completion rates by project"
- "What tasks am I consistently not completing?"
- "Suggest task prioritization based on my patterns"

### 🔐 Security Features

- **Read-Only Access**: MCP server cannot modify or delete tasks
- **API Key Authentication**: Secure token-based access control
- **Key Expiration**: Automatic key expiration for security
- **Usage Tracking**: Monitor when and how keys are used
- **Local Network Only**: Server binds to localhost by default
- **Encrypted Storage**: API keys are SHA-256 hashed in database

### 📚 Complete Documentation

For detailed setup instructions and platform-specific integration guides:
- **Setup Guide**: `docs/mcp/SETUP.md`
- **Platform Integrations**: `docs/mcp/PLATFORM_INTEGRATIONS.md`
- **API Reference**: Available at `http://localhost:3002/openapi.json`

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

### API Management Commands

#### `api generate-key <name>`
Generate a new API key for MCP server integration.
```bash
# Generate with default 90-day expiration
todo api generate-key "Claude Integration"

# Custom expiration periods
todo api generate-key "Short Term" --expires 30
todo api generate-key "Long Term" --expires 365
todo api generate-key "Permanent" --expires never
```

**Options:**
- `--expires, -e`: Key expiration period (30/90/365/never, default: 90)
- `--replace, -r`: Replace existing key with same name (default: true)

#### `api list-keys`
List all active API keys with status information.
```bash
todo api list-keys
```

Shows:
- Key names and prefixes
- Creation and expiration dates
- Last used timestamps
- Expiration warnings

#### `api revoke-key <keyId>`
Revoke an API key by ID.
```bash
todo api revoke-key abc123def456
```

#### `api info`
Show information about MCP server integration and supported platforms.
```bash
todo api info
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

### TASK.SH Cloud Service (Optional)
Cloud sync is completely optional. The app works perfectly offline by default.

**🌟 Managed Cloud Service - No Setup Required!**

TASK.SH includes a built-in managed cloud service. No configuration, no API keys, no complexity!

**Quick Start:**
```bash
# Check service status
todo status

# Or from interactive mode
todo
/status
```

**Getting Started with Cloud Sync:**
1. **Launch Interactive Mode**: `todo`
2. **Create Account**: Type `/login` and choose "Create new account"
3. **Start Syncing**: Your tasks automatically sync across all devices!

**That's it!** No configuration files, no API keys, no setup complexity.

### Cloud Features
- ✅ **Automatic Sync**: Tasks sync across all your devices
- ✅ **Secure Backup**: Your data is safely stored and backed up
- ✅ **Zero Configuration**: Just create an account and go
- ✅ **Privacy First**: Your tasks are private and secure
- ✅ **Offline First**: Works perfectly offline, syncs when connected

### Service Commands
```bash
# Interactive mode
/status         # Check service and account status
/login          # Open login screen  
/logout         # Sign out from account
/sync           # Manual sync

# CLI mode
todo status     # Service status and account info
todo logout     # Sign out
todo sync       # Manual sync
```

### Storage & Privacy
- **Local tasks**: Stored in `data/tasks.json` (offline mode)
- **Cloud tasks**: Stored in `data/cloud-tasks.json` + TASK.SH service
- **Complete isolation**: Local and cloud tasks never mix
- **Privacy first**: Each user sees only their own tasks
- **Secure**: All data encrypted in transit and at rest

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
| Service status | `status` | - | `/status` | ✅ |
| Authentication | `logout` | - | `/login` `/logout` | ✅ |
| API key generation | `api generate-key` | - | `/api` → `g` | ✅ |
| API key management | `api list-keys` `api revoke-key` | - | `/api` (full interface) | ✅ |
| API integration info | `api info` | - | `/api` (contextual help) | ✅ |
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

# AI-powered analysis (with MCP server running)
# Ask your AI assistant: "What are my incomplete tasks and priorities?"
# Or: "Analyze my productivity patterns for this week"
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

### AI-Powered Workflows
```bash
# Setup AI integration (one-time)
todo api generate-key "Claude Desktop"  # Generate API key
npm run dev:mcp                         # Start MCP server

# AI assistant workflows:
# "Export my work project tasks as markdown"
# "What tasks are overdue and need attention?"
# "Generate a productivity report for this week"
# "Suggest task prioritization based on my patterns"
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
/api                            # Manage AI integration keys
/help                           # Remember all commands

# AI-powered reporting (ask your AI assistant):
# "Generate a weekly productivity summary"
# "Create a project completion status report"
# "What patterns do you see in my task management?"
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
│   ├── mcp-server.ts    # MCP server implementation
│   ├── api-key-manager.ts # API key management
│   └── ...
├── dist/                # Compiled JavaScript
│   ├── mcp-start.js     # MCP server entry point
│   └── ...
├── data/
│   ├── tasks.json       # Local/offline tasks
│   ├── cloud-tasks.json # Authenticated user tasks
│   └── offline-changes.json # Sync queue
├── docs/mcp/            # MCP integration documentation
│   ├── SETUP.md         # Complete setup guide
│   └── PLATFORM_INTEGRATIONS.md # Platform-specific guides
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

**MCP Server issues:**
```bash
# Check if MCP server is running
curl http://localhost:3002/health

# Verify API key is valid
todo api list-keys

# Check port conflicts
lsof -i :3002

# Restart MCP server
npm run dev:mcp
```

**AI Integration issues:**
- Verify API key format starts with `sk_user_`
- Check MCP server is accessible from AI tool
- Review platform-specific setup in `docs/mcp/`
- Test with curl commands from documentation

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

**TASK.SH**: Complete todo management with CLI-Interactive feature parity + AI integration. Your tasks, your AI assistant, your way! 🎯🤖