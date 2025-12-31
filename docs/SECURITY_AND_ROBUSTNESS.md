# Security, Robustness, and Data Persistence Guide

## Overview

This document outlines the comprehensive security, robustness, and data persistence measures implemented in Kinship Atlas to protect generations of family data, stories, and media.

## 🛡️ Security Measures

### 1. Authentication & Authorization

#### Row-Level Security (RLS)
- **All tables** have RLS enabled
- Users can only access their own data
- Policies enforce data isolation at the database level
- Admin roles can manage all data (when implemented)

#### Authentication
- Supabase Auth with email/password
- Secure session management
- Token refresh handling
- Session cleanup on URL changes

### 2. Input Validation & Sanitization

#### Client-Side Validation
- **Zod schemas** for all form inputs
- Type checking and format validation
- Length limits on all text fields
- Date validation (birth < death, no future dates)
- File size validation (5MB max for media)

#### Server-Side Validation
- Database constraints enforce data integrity
- Check constraints for enum values
- Foreign key constraints prevent orphaned data
- Date validation triggers
- Self-reference prevention

#### XSS Protection
- **DOMPurify** for sanitizing HTML content in stories
- Content Security Policy (CSP) headers
- No raw HTML rendering without sanitization
- Safe text rendering for user-generated content

### 3. File Upload Security

#### Validation
- File type validation (MIME type checking)
- File size limits (5MB for media)
- File extension whitelist
- Virus scanning (when available)

#### Storage Security
- Files stored in user-specific directories
- Signed URLs for secure access
- RLS policies on storage buckets
- No public file access without authentication

### 4. Data Protection

#### Encryption
- Data encrypted in transit (HTTPS/TLS)
- Data encrypted at rest (Supabase managed)
- Secure credential storage

#### Privacy
- User data isolation via RLS
- No cross-user data access
- Secure API endpoints
- No sensitive data in client-side code

## 🔒 Data Robustness

### 1. Database Integrity

#### Constraints
- **Foreign Key Constraints**: CASCADE/SET NULL behaviors
- **Check Constraints**: Valid enum values, date logic
- **Unique Constraints**: Prevent duplicates
- **NOT NULL Constraints**: Required fields

#### Triggers
- **Date Validation**: Ensures birth < death
- **Relationship Consistency**: Auto-creates bidirectional relationships
- **Updated Timestamps**: Automatic `updated_at` tracking
- **Orphan Cleanup**: Detects and removes orphaned data

#### Indexes
- Performance indexes on frequently queried columns
- Composite indexes for common query patterns
- Partial indexes for filtered queries

### 2. Transaction Support

#### Atomic Operations
- Database transactions for multi-step operations
- Rollback on failure
- Consistent state guarantees
- Error recovery

#### Example: Creating Family Member with Location
```typescript
// All operations in a single transaction
BEGIN;
  INSERT INTO family_members ...;
  INSERT INTO locations ...;
  UPDATE family_members SET branch_root ...;
COMMIT;
```

### 3. Soft Deletes

#### Data Preservation
- Records marked as deleted instead of removed
- `deleted_at` timestamp tracking
- Data recovery capability
- Audit trail preservation

#### Implementation
- All critical tables have `deleted_at` column
- Queries filter out deleted records
- Admin can restore deleted data
- Permanent deletion requires admin action

### 4. Data Versioning

#### History Tracking
- `audit_log` table tracks all changes
- Before/after values stored
- User and timestamp recorded
- Change type (INSERT, UPDATE, DELETE) tracked

#### Recovery
- View historical versions of records
- Restore from audit log
- Compare versions
- Track data lineage

## 💾 Data Persistence

### 1. Automated Backups

#### Database Backups
- **Daily automated backups** (Supabase Cloud)
- **Point-in-time recovery** available
- **Backup retention**: 7-30 days (configurable)
- **Manual backup triggers** via scripts

#### Storage Backups
- Media files backed up to secondary storage
- Versioned backups for important files
- Geographic redundancy (Supabase managed)

#### Backup Scripts
```bash
# Create backup
npm run backup:create

# List backups
npm run backup:list

# Restore from backup
npm run backup:restore <backup-id>
```

### 2. Data Export

#### Export Formats
- **JSON**: Complete data export
- **GEDCOM**: Standard genealogy format
- **CSV**: Tabular data export
- **SQL**: Database dump format

#### Export Features
- User-specific data export
- Selective export (members, stories, media)
- Encrypted exports for sensitive data
- Scheduled exports

### 3. Data Import

#### Import Validation
- Schema validation before import
- Duplicate detection
- Data integrity checks
- Rollback on failure

#### Import Formats
- JSON import
- GEDCOM import
- CSV import
- SQL restore

### 4. Disaster Recovery

#### Recovery Procedures
1. **Identify failure**: Database corruption, data loss, etc.
2. **Assess damage**: Determine scope of data loss
3. **Restore from backup**: Use most recent clean backup
4. **Verify integrity**: Run health checks
5. **Resume operations**: Confirm system stability

#### Recovery Scripts
```bash
# Health check
npm run health:check

# Integrity verification
npm run integrity:verify

# Recovery from backup
npm run recovery:restore <backup-id>
```

## 🔍 Monitoring & Health Checks

### 1. Database Health

#### Health Check Utilities
- Connection testing
- Table existence verification
- Migration status checking
- Orphaned data detection
- Constraint validation

#### Automated Monitoring
- Daily health checks
- Alert on failures
- Performance monitoring
- Storage usage tracking

### 2. Error Tracking

#### Error Logging
- Structured error logging
- Error categorization
- Stack trace capture
- User context included

#### Error Recovery
- Automatic retry for transient errors
- Graceful degradation
- User-friendly error messages
- Error reporting to admins

### 3. Audit Logging

#### Logged Events
- User authentication (login, logout)
- Data creation (members, stories, media)
- Data modification (updates, deletes)
- Permission changes
- System events

#### Log Storage
- Secure log storage
- Retention policies
- Searchable logs
- Compliance-ready

## 📋 Best Practices

### For Developers

1. **Always use transactions** for multi-step operations
2. **Validate input** on both client and server
3. **Sanitize HTML** before rendering
4. **Use soft deletes** instead of hard deletes
5. **Log all changes** to audit log
6. **Test error recovery** paths
7. **Monitor health checks** regularly

### For Administrators

1. **Schedule regular backups**
2. **Test restore procedures** quarterly
3. **Monitor health checks** daily
4. **Review audit logs** weekly
5. **Update security policies** as needed
6. **Keep dependencies updated**
7. **Document recovery procedures**

### For Users

1. **Export your data** regularly
2. **Keep backups** of important media
3. **Report issues** immediately
4. **Use strong passwords**
5. **Don't share credentials**

## 🚨 Incident Response

### Data Loss
1. Stop all operations immediately
2. Assess scope of loss
3. Restore from most recent backup
4. Verify data integrity
5. Investigate root cause
6. Implement prevention measures

### Security Breach
1. Identify breach scope
2. Revoke compromised credentials
3. Notify affected users
4. Patch vulnerabilities
5. Review audit logs
6. Update security measures

### Data Corruption
1. Identify corrupted data
2. Isolate affected records
3. Restore from backup
4. Run integrity checks
5. Fix root cause
6. Monitor for recurrence

## 📊 Compliance & Standards

### Data Protection
- GDPR compliance considerations
- Data retention policies
- Right to deletion
- Data portability

### Security Standards
- OWASP Top 10 compliance
- Secure coding practices
- Regular security audits
- Penetration testing

## 🔄 Continuous Improvement

### Regular Reviews
- Monthly security review
- Quarterly backup testing
- Annual disaster recovery drill
- Ongoing monitoring

### Updates
- Security patches applied immediately
- Dependency updates monthly
- Feature security reviews
- Performance optimization

## 📚 Related Documentation

- [Database Migrations](./DATABASE_MIGRATIONS.md)
- [Supabase Improvements](./SUPABASE_IMPROVEMENTS.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Local Development](./LOCAL_DEVELOPMENT.md)

