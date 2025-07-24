# TASK.SH Production Setup Guide

This guide will help you deploy TASK.SH as a production SaaS service.

## 🚀 Quick Setup Checklist

- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Update CLI with your credentials
- [ ] Test authentication flow
- [ ] Publish to NPM
- [ ] Monitor usage

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for setup to complete (2-3 minutes)
4. Note your **Project URL** and **Anon Key** from Settings > API

## Step 2: Set Up Database

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy and paste the entire contents of `supabase-schema.sql`
3. Click **Run** - you should see success messages
4. Verify the `tasks` table was created in **Table Editor**

## Step 3: Update CLI Credentials

### Get Your Encoded Credentials:

```bash
# 1. Encode your Supabase URL
echo -n "https://your-project-ref.supabase.co" | base64
# Copy the output

# 2. Encode your Anon Key  
echo -n "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key" | base64
# Copy the output
```

### Update the Code:

Edit `src/supabase.ts`:

```typescript
function getSecureServiceUrl(): string {
  // Replace with your encoded URL
  const encoded = 'YOUR_BASE64_ENCODED_URL_HERE';
  return Buffer.from(encoded, 'base64').toString();
}

function getSecureServiceKey(): string {
  // Replace with your encoded anon key
  const encoded = 'YOUR_BASE64_ENCODED_ANON_KEY_HERE';
  return Buffer.from(encoded, 'base64').toString();
}
```

## Step 4: Test Locally

```bash
# Build and install locally
npm run build
npm run install:global

# Test authentication
todo status
todo  # Launch interactive mode
/login  # Try creating an account
```

## Step 5: Prepare for NPM Publication

### Update Package Information:

Edit `package.json`:

```json
{
  "name": "@your-username/tasksh-cli",
  "version": "1.0.0",
  "description": "Professional todo management with cloud sync",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/tasksh-cli.git"
  },
  "keywords": ["todo", "productivity", "cli", "task-management", "saas"]
}
```

### Create NPM Account (if needed):

```bash
npm login
# Follow prompts to create/login to NPM account
```

## Step 6: Publish to NPM

```bash
# Final build
npm run build

# Publish (first time)
npm publish --access public

# For updates
npm version patch  # or minor/major
npm publish
```

## Step 7: User Installation

Users will install your CLI with:

```bash
npm install -g @your-username/tasksh-cli
tasksh  # or whatever command name you chose
```

## 🔒 Security Verification

### Test Row Level Security:

1. Create two different user accounts
2. Add tasks to each account
3. Verify users can't see each other's tasks
4. Check Supabase **Authentication** tab for user management

### Monitor Usage:

- **Database** tab: Monitor table size and queries
- **Authentication** tab: Track user signups
- **Logs** tab: Monitor for errors or abuse

## 📊 Monitoring & Analytics

### Key Metrics to Track:

1. **User Growth**: New signups per day/week
2. **Engagement**: Active users, tasks created
3. **Performance**: API response times
4. **Errors**: Failed authentications, sync issues

### Supabase Dashboard:

- Monitor database usage and performance
- Track API calls and bandwidth
- Set up email alerts for issues

## 💰 Monetization Options

### Freemium Model:
- Free: 100 tasks, basic sync
- Pro: Unlimited tasks, advanced features ($5/month)

### Implementation:
```sql
-- Add subscription tracking to users
ALTER TABLE auth.users ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE auth.users ADD COLUMN subscription_expires TIMESTAMP;

-- Update rate limiting based on tier
-- (modify check_user_rate_limit function)
```

## 🚨 Production Considerations

### Security:
- ✅ RLS policies prevent data leaks
- ✅ Base64 encoding obscures credentials
- ✅ Rate limiting prevents abuse
- ✅ Supabase handles infrastructure security

### Scaling:
- Supabase auto-scales with usage
- Monitor costs in Supabase dashboard
- Consider upgrading to Pro plan for production

### Backup:
- Supabase handles automatic backups
- Consider additional backup strategy for critical data

### Legal:
- Add Terms of Service and Privacy Policy
- Comply with GDPR/CCPA if applicable
- Consider liability insurance for SaaS

## 🆘 Troubleshooting

### Common Issues:

**Users can't sign up:**
- Check Supabase Auth settings
- Verify email templates are configured
- Check for RLS policy conflicts

**Sync not working:**
- Verify RLS policies are correct
- Check network connectivity
- Monitor Supabase logs for errors

**Performance issues:**
- Check database indexes are created
- Monitor query performance in Supabase
- Consider upgrading Supabase plan

## 🎯 Next Steps

1. **Beta Testing**: Share with 10-20 users for feedback
2. **Feature Expansion**: Add team features, integrations
3. **Marketing**: Create landing page, documentation
4. **Support**: Set up help desk, documentation

## 📞 Support

For technical issues:
- Check Supabase logs and documentation
- Monitor GitHub issues for your CLI
- Set up user feedback collection

---

**🎉 Congratulations!** You now have a production-ready SaaS todo CLI with enterprise-grade security and automatic scaling.