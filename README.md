# Kinship Atlas - Genealogy Platform

[![CI/CD Pipeline](https://github.com/your-username/kinship-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/kinship-atlas/actions/workflows/ci.yml)
[![Test Coverage](https://codecov.io/gh/your-username/kinship-atlas/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/kinship-atlas)

A comprehensive genealogy platform where users can create family members, build family trees, manage relationships, organize media, and preserve family stories.

## 🌟 Features

### ✅ **Core Features (Implemented)**

- **👥 Family Member Management**
  - Add, edit, and delete family members
  - Complete profiles with photos, dates, locations, and biographies
  - Gender-based styling and deceased member indicators
  - Location tracking with coordinates

- **🌳 Interactive Family Tree**
  - Visual family tree with React Flow integration
  - Interactive navigation with zoom, pan, and node selection
  - Color-coded relationship edges (marriage, parent-child, siblings)
  - **Merged connectors** for spouse pairs with common children (classic family tree pattern)
  - Generation-based automatic layout
  - Focus mode for highlighting direct connections
  - Legend and minimap for better navigation
  - Drag-to-connect interface for creating relationships

- **📸 Media Management**
  - Drag-and-drop file upload with progress tracking
  - Support for images, documents, audio, and video files
  - Media organization by type with search and filtering
  - Caption editing and metadata management
  - Integration with family member profiles
  - Supabase Storage with proper security policies

- **🔗 Relationship Management**
  - Add parent, child, spouse, and sibling relationships
  - Automatic reciprocal relationship creation
  - Visual relationship indicators in the family tree
  - Relationship validation and conflict detection

- **📖 Family Stories**
  - Create and manage family stories
  - Attach media to stories
  - Link stories to family members
  - Rich text content with image support
  - Story categories (Biography, Migration, Heritage, Memories, Historical)
  - Location tracking for stories
  - Artifacts system (documents, heirlooms, photos, letters, certificates)

- **📁 Albums & Organization**
  - Create albums to organize media
  - Organize by family groups, family members, or story categories
  - Cover images for albums
  - Album-media relationships

- **👨‍👩‍👧‍👦 Family Groups**
  - Organize family members into groups (e.g., "Mother's Side", "Father's Side")
  - Group-based media and story organization
  - Flexible grouping system

- **📥 Data Import/Export**
  - Import family data from Excel (.xlsx, .xls) files
  - Import from JSON files
  - Import family members, relationships, and stories
  - Preview data before importing
  - Progress tracking during import
  - Template files for easy data preparation

- **🔐 Authentication & Security**
  - Supabase authentication with email/password
  - Row-level security (RLS) for data protection
  - User-specific data isolation
  - Secure file upload and storage
  - **Role-based access control** (Admin, Editor, Viewer)
  - **XSS protection** with DOMPurify
  - **Audit logging** for all data changes
  - **Soft deletes** to prevent data loss
  - **Automated backups** and health monitoring

### 🚧 **Planned Features**

- **📅 Timeline View** - Chronological family events and milestones
- **🤝 Collaboration** - Family sharing and collaborative editing
- **📊 Import/Export** - GEDCOM file support for data portability
- **🔍 Advanced Search** - Comprehensive search across all family data
- **🔒 Privacy Controls** - Granular privacy settings for living vs deceased
- **👨‍💼 Admin Panel** - Platform management and analytics

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **shadcn/ui** + Radix UI for accessible components
- **React Router v6** for client-side routing
- **TanStack Query v5** for server state management
- **React Hook Form** + Zod for form validation
- **@xyflow/react** for interactive family tree visualization

### Backend & Database
- **Supabase** for backend-as-a-service
  - PostgreSQL database with Row Level Security
  - Real-time subscriptions
  - Authentication and user management
  - File storage with CDN
- **TypeScript** for end-to-end type safety

### Development Tools
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for static type checking

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Docker Desktop** (for local Supabase development)
- **Git** (for version control)

### Quick Start (Local Development)

1. **Clone the repository**
   ```bash
git clone <YOUR_GIT_URL>
   cd kinship-atlas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the environment template
   cp env.template .env.local
   ```
   
   The `.env.local` file supports both local and remote Supabase:
   ```env
   # Switch between 'local' (Docker) or 'remote' (Supabase Cloud)
   VITE_SUPABASE_MODE=local
   
   # Local Supabase (Docker Compose)
   VITE_SUPABASE_URL_LOCAL=http://localhost:60011
   VITE_SUPABASE_ANON_KEY_LOCAL=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Remote Supabase (get from https://app.supabase.com)
   VITE_SUPABASE_URL_REMOTE=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY_REMOTE=your-remote-anon-key
   ```
   
   **Quick Switch Commands:**
   ```bash
   # Switch to local Supabase (Docker)
   npm run supabase:local
   
   # Switch to remote Supabase (Cloud)
   npm run supabase:remote
   ```

4. **Start local development environment**
   ```bash
   # Start Supabase and React dev server together
   npm run dev:full
   ```
   
   Or start them separately:
   ```bash
   # Start Supabase local stack
   npm run supabase:start
   
   # In another terminal, start React dev server
   npm run dev
   ```

5. **Access the application**
   - **Frontend**: http://localhost:5173 (or http://localhost:8080)
   - **Supabase Studio (Local)**: http://localhost:60002
   - **API (Local)**: http://localhost:60011 (via proxy) or http://localhost:60001 (direct)

### Switching Between Local and Remote Supabase

You can easily switch between local Docker Supabase and remote Supabase Cloud:

**Switch to Local (Docker):**
```bash
npm run supabase:local
# Make sure Docker Compose is running: docker-compose -f docker-compose.dev.yml up -d
```

**Switch to Remote (Cloud):**
```bash
npm run supabase:remote
# Make sure VITE_SUPABASE_URL_REMOTE and VITE_SUPABASE_ANON_KEY_REMOTE are set in .env.local
```

**Important:** After switching, restart your development server:
```bash
npm run dev
```

The app will automatically use the correct Supabase instance based on `VITE_SUPABASE_MODE` in your `.env.local` file.

### Alternative: Docker Compose

If you prefer using Docker Compose directly:

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Start the React development server
npm run dev
```

### Production Setup

For production deployment:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Update environment variables** with your production URLs
3. **Deploy migrations** to your production database
4. **Deploy your frontend** to your hosting provider

📖 **For detailed setup instructions, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)**

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── family/         # Family tree and member components
│   ├── layout/         # Layout components
│   ├── media/          # Media management components
│   ├── stories/        # Story components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── pages/              # Route components
├── services/           # API and business logic
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## 🎯 Key Features in Detail

### Family Tree Visualization
- **Interactive Nodes**: Click to view member details, drag to reorganize
- **Relationship Lines**: Color-coded edges showing different relationship types
- **Merged Connectors**: When two spouses have common children, parent lines merge into a single horizontal line before branching to children (classic family tree pattern)
- **Generation Layout**: Automatic positioning based on family generations
- **Focus Mode**: Highlight direct family connections for complex trees
- **Mobile Responsive**: Touch-friendly navigation on mobile devices

### Media Management
- **Multi-format Support**: Images, documents, audio, and video files
- **Drag & Drop Upload**: Intuitive file upload with progress indicators
- **Organization**: Filter by type, search by name/caption, sort by date
- **Integration**: Attach media to family members and stories
- **Optimization**: Automatic image optimization and thumbnail generation

### Data Management
- **Real-time Updates**: Changes sync across all connected clients
- **Data Validation**: Comprehensive form validation with error handling
- **Relationship Integrity**: Automatic reciprocal relationship management
- **Data Import**: Import family data from Excel or JSON files
- **Backup & Recovery**: Automated backups and data export capabilities
- **Audit Logging**: Complete history of all data changes
- **Soft Deletes**: Prevent accidental data loss with recoverable deletions
- **Health Monitoring**: Automated health checks and integrity verification

### Family Tree Connectors
- **Merged Connectors**: Automatic merging of parent lines for spouse pairs with common children
- **Classic Family Tree Pattern**: Traditional family tree appearance with merged lines
- **Line Snapping**: Parallel lines automatically snap together for clean appearance
- **Branch Lines**: Horizontal branch lines spanning all children
- **Visual Clarity**: Clear individual connections to each child

## 🔧 Development

### Available Scripts

#### Development
- `npm run dev` - Start React development server only
- `npm run dev:full` - Start both Supabase and React dev server
- `npm run dev:setup` - Initial setup (start Supabase + seed data)
- `npm run dev:clean` - Clean restart (stop + start + seed)

#### Supabase Local Development
- `npm run supabase:start` - Start local Supabase stack
- `npm run supabase:stop` - Stop local Supabase stack
- `npm run supabase:status` - Show Supabase services status
- `npm run supabase:studio` - Open Supabase Studio dashboard
- `npm run supabase:reset` - Reset local database
- `npm run supabase:seed` - Reset database and load seed data

#### Database Management
- `npm run supabase:db:push` - Push local migrations to remote
- `npm run supabase:db:pull` - Pull remote schema to local
- `npm run supabase:db:diff` - Show differences between local and remote
- `npm run supabase:migration:new` - Create new migration file

#### Backup & Maintenance
- `npm run backup:create` - Create database backup
- `npm run backup:list` - List available backups
- `npm run health:check` - Perform database health check

#### Build & Deploy
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style
- Follow the established patterns in `.cursorrules`
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Maintain consistent component structure

## 🚀 CI/CD Pipeline

Kinship Atlas uses GitHub Actions for continuous integration and deployment:

- **Automated Testing**: Runs on every push and PR with 80% coverage requirement
- **Health Checks**: Database integrity verification
- **Security Audits**: Automated vulnerability scanning
- **Type Checking**: TypeScript validation
- **Linting**: Code quality enforcement
- **Automated Releases**: Production deployment on main branch

📖 **For CI/CD details, see [CI/CD Pipeline Documentation](./docs/CI_CD_PIPELINE.md)**

### Running CI Checks Locally

```bash
# Run all CI checks
npm run ci:check

# Individual checks
npm run lint          # Linting
npm run type-check    # Type checking
npm run test:coverage # Tests with coverage (80% required)
npm run build         # Build check
npm run health:check  # Health check
```

## 🚀 Deployment

### Lovable Platform
Simply open [Lovable](https://lovable.dev/projects/4cb5ff95-9af0-4fd4-bc8b-5a23ff139ccc) and click on Share -> Publish.

### Custom Domain
Navigate to Project > Settings > Domains and click Connect Domain.

### Self-Hosting
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure environment variables
4. Set up Supabase project with proper CORS settings

## 📄 License

This project is part of the Lovable platform. See Lovable's terms of service for usage rights.

## 🤝 Contributing

This project follows the development guidelines outlined in `.cursorrules`. Please review the architecture and coding standards before contributing.

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

### Getting Started
- **[Local Development Guide](./docs/LOCAL_DEVELOPMENT.md)** - Setting up your development environment
- **[Features Summary](./docs/FEATURES_SUMMARY.md)** - Complete overview of all implemented features

### Core Systems
- **[Family System Redesign](./docs/FAMILY_SYSTEM_REDESIGN.md)** - Family relationship management system
- **[Family Tree Connector Improvements](./docs/FAMILY_TREE_CONNECTOR_IMPROVEMENTS.md)** - Merged connector system
- **[Family Data Import System](./docs/FAMILY_DATA_IMPORT_SYSTEM.md)** - Importing family data

### Database & Migrations
- **[Database Migrations](./docs/DATABASE_MIGRATIONS.md)** - Migration system and workflow
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Development & Operations
- **[CI/CD Pipeline](./docs/CI_CD_PIPELINE.md)** - Continuous integration and deployment
- **[Testing Guide](./docs/TESTING_GUIDE.md)** - Testing strategies and best practices
- **[Security Implementation](./docs/SECURITY_AND_ROBUSTNESS.md)** - Security features and best practices

## 📞 Support

For support and questions:
- Check the documentation in the `docs/` directory
- Review the project's `.cursorrules` for development guidelines
- Open an issue in the repository