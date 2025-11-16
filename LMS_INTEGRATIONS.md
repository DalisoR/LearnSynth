# LMS Integrations - LearnSynth

## 🎓 Overview

LearnSynth integrates with major Learning Management Systems (LMS) to provide seamless course management, assignment synchronization, and grade passback.

## 🌐 Supported LMS Platforms

### 1. **Canvas**
- **API**: Canvas REST API v1
- **Authentication**: Bearer Token
- **Documentation**: [Canvas API Docs](https://canvas.instructure.com/doc/api/)

**Features:**
- ✅ Course enrollment sync
- ✅ Assignment creation and sync
- ✅ Grade passback
- ✅ Real-time roster updates

**Setup:**
1. Generate API token in Canvas
2. Note your Canvas instance URL
3. Enter credentials in LearnSynth

### 2. **Blackboard Learn**
- **API**: Blackboard REST API
- **Authentication**: OAuth 2.0 / API Key
- **Documentation**: [Blackboard API Docs](https://developer.anthology.com/portal/displayApi/Learn)

**Features:**
- ✅ Course catalog sync
- ✅ Assignment management
- ✅ Gradebook integration
- ✅ User management

**Setup:**
1. Create OAuth application in Blackboard
2. Get Client ID and Secret
3. Configure redirect URI

### 3. **Moodle**
- **API**: Moodle Web Services
- **Authentication**: Token-based
- **Documentation**: [Moodle API Docs](https://docs.moodle.org/dev/Web_services)

**Features:**
- ✅ Course enrollment
- ✅ Assignment creation
- ✅ Grade synchronization
- ✅ User roles management

**Setup:**
1. Enable web services in Moodle
2. Create a web service user
3. Generate security token

### 4. **Google Classroom**
- **API**: Google Classroom API v1
- **Authentication**: OAuth 2.0
- **Documentation**: [Google Classroom API](https://developers.google.com/classroom)

**Features:**
- ✅ Course listing
- ✅ Assignment management
- ✅ Student roster
- ✅ Grade passback

**Setup:**
1. Enable Google Classroom API
2. Create OAuth 2.0 credentials
3. Configure consent screen

### 5. **Schoology**
- **API**: Schoology API
- **Authentication**: OAuth 1.0a / API Key
- **Documentation**: [Schoology API](https://developers.schoology.com/)

**Features:**
- ✅ Course management
- ✅ Assignment creation
- ✅ Grade integration
- ✅ Enrollment tracking

**Setup:**
1. Register application in Schoology
2. Get API key and secret
3. Configure OAuth settings

## 🏗️ Architecture

### Backend Implementation

```typescript
// Factory Pattern for LMS Integrations
const lms = LMSFactory.create({
  provider: LMSProvider.CANVAS,
  baseUrl: 'https://your-school.instructure.com',
  apiKey: 'your-api-token',
});

// Use unified interface
const courses = await lms.getCourses();
const assignments = await lms.getAssignments(courseId);
const grade = await lms.syncGrade(assignmentId, userId, score);
```

### Frontend Implementation

```typescript
const { status, courses, connect, fetchCourses } = useLMS();

// Connect to LMS
await connect({
  provider: LMSProvider.CANVAS,
  baseUrl: 'https://your-school.instructure.com',
  apiKey: 'your-api-token',
});

// Fetch courses
const courses = await fetchCourses();
```

## 🔌 API Endpoints

### Connection Management

```bash
# Connect to LMS
POST /api/lms/connect
{
  "provider": "canvas",
  "baseUrl": "https://your-lms.com",
  "apiKey": "your-token"
}

# Check connection status
GET /api/lms/status

# Disconnect from LMS
POST /api/lms/disconnect
```

### Course Management

```bash
# Get all courses
GET /api/lms/courses

# Get specific course
GET /api/lms/courses/:courseId

# Get course assignments
GET /api/lms/courses/:courseId/assignments

# Create assignment
POST /api/lms/courses/:courseId/assignments
{
  "name": "Assignment Title",
  "description": "Assignment description",
  "dueDate": "2025-12-31T23:59:59Z",
  "pointsPossible": 100,
  "status": "published"
}
```

### Grade Management

```bash
# Get grades for course
GET /api/lms/courses/:courseId/grades
GET /api/lms/courses/:courseId/grades?userId=123

# Sync grade to LMS
POST /api/lms/sync-grade
{
  "assignmentId": "assign-123",
  "userId": "user-456",
  "score": 95
}
```

### Enrollment Management

```bash
# Get course enrollments
GET /api/lms/courses/:courseId/enrollments
```

## 📊 Use Cases

### 1. Single Sign-On (SSO)
- Authenticate users from LMS
- Automatic user provisioning
- Role-based access control

```typescript
// Example: Canvas OAuth Flow
app.get('/auth/canvas', (req, res) => {
  const redirectUri = `${baseUrl}/api/auth/canvas/callback`;
  const authUrl = `https://canvas.instructure.com/login/oauth2/auth?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`;
  res.redirect(authUrl);
});
```

### 2. Grade Passback
- Sync quiz scores to LMS gradebook
- Automatic grade updates
- Real-time sync

```typescript
// Sync grade after quiz completion
const result = await lms.syncGrade(
  assignmentId,
  userId,
  score
);
```

### 3. Assignment Creation
- Create assignments from LearnSynth
- Sync to LMS gradebook
- Set due dates and points

```typescript
await lms.createAssignment(courseId, {
  name: 'AI Quiz on Chapter 5',
  description: 'Complete the quiz on machine learning',
  dueDate: new Date('2025-12-31'),
  pointsPossible: 100,
  status: 'published',
});
```

### 4. Roster Sync
- Import student lists
- Sync enrollment data
- Track active users

```typescript
const enrollments = await lms.getEnrollments(courseId);
enrollments.forEach(student => {
  console.log(`${student.name} (${student.email})`);
});
```

## 🔐 Authentication Methods

### 1. API Token (Canvas, Moodle)
```typescript
const config = {
  provider: LMSProvider.CANVAS,
  baseUrl: 'https://school.instructure.com',
  apiKey: 'generated-api-token',
};
```

### 2. OAuth 2.0 (Google Classroom, Blackboard)
```typescript
const config = {
  provider: LMSProvider.GOOGLE_CLASSROOM,
  baseUrl: 'https://classroom.googleapis.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  redirectUri: 'https://app.learnsynth.com/auth/callback',
};
```

### 3. OAuth 1.0a (Schoology)
```typescript
const config = {
  provider: LMSProvider.SCHOOLOGY,
  baseUrl: 'https://school.schoology.com',
  apiKey: 'your-api-key',
  clientSecret: 'your-client-secret',
};
```

## 📝 Integration Guide

### For Institutions

1. **Choose Your LMS**
   - Identify which LMS your institution uses
   - Check LearnSynth compatibility
   - Review API requirements

2. **Obtain API Credentials**
   - Contact your LMS administrator
   - Generate API tokens
   - Configure OAuth applications

3. **Configure LearnSynth**
   - Navigate to Settings > Integrations
   - Enter LMS credentials
   - Test connection

4. **Sync Data**
   - Import courses
   - Sync enrollments
   - Configure grade passback

5. **Train Users**
   - Provide documentation
   - Train instructors
   - Set up support channels

### For Developers

1. **Add New LMS Support**

```typescript
// In lmsFactory.ts
class NewLMSIntegration implements ILMSIntegration {
  // Implement all required methods
  async getUser(): Promise<LMSUser> { }
  async getCourses(): Promise<LMSCourse[]> { }
  // ... etc
}

// Register in factory
case LMSProvider.NEW_LMS:
  return new NewLMSIntegration(config);
```

2. **Handle Rate Limits**
```typescript
class RateLimitedLMS {
  private requests: number = 0;
  private resetTime: number = Date.now();

  async makeRequest(endpoint: string) {
    if (Date.now() > this.resetTime) {
      this.requests = 0;
      this.resetTime = Date.now() + 60000; // Reset every minute
    }

    if (this.requests >= 100) {
      const waitTime = this.resetTime - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests++;
    // Make actual request
  }
}
```

3. **Error Handling**
```typescript
try {
  const courses = await lms.getCourses();
} catch (error) {
  if (error.code === 'INVALID_TOKEN') {
    // Prompt user to refresh token
    await refreshAuthToken();
  } else if (error.code === 'RATE_LIMITED') {
    // Wait and retry
    await delay(60000);
    return retry();
  }
}
```

## 🧪 Testing

### Unit Tests
```typescript
import { LMSFactory } from '@/services/lms/lmsFactory';

test('creates Canvas integration', () => {
  const config = {
    provider: LMSProvider.CANVAS,
    baseUrl: 'https://test.instructure.com',
    apiKey: 'test-key',
  };

  const lms = LMSFactory.create(config);
  expect(lms).toBeInstanceOf(CanvasIntegration);
});

test('fetches courses successfully', async () => {
  const lms = LMSFactory.create(config);
  const courses = await lms.getCourses();
  expect(Array.isArray(courses)).toBe(true);
});
```

### Integration Tests
```typescript
import { test, expect } from '@playwright/test';

test('can connect to Canvas', async ({ page }) => {
  await page.goto('/settings/integrations');

  await page.selectOption('select[name="provider"]', 'canvas');
  await page.fill('input[name="baseUrl"]', 'https://test.instructure.com');
  await page.fill('input[name="apiKey"]', 'test-token');

  await page.click('button[type="submit"]');

  await expect(page.locator('[data-testid="connected-badge"]')).toBeVisible();
});
```

## 📈 Monitoring & Analytics

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Connection Success Rate | Percentage of successful LMS connections | >95% |
| API Response Time | Average API response time | <2s |
| Sync Success Rate | Grade/assignment sync success rate | >98% |
| Error Rate | API error rate | <2% |

### Logging

```typescript
// Log all LMS API calls
logger.info('LMS API Request', {
  provider: config.provider,
  endpoint,
  userId,
  timestamp: new Date().toISOString(),
});

// Log errors with context
logger.error('LMS API Error', {
  provider: config.provider,
  error: error.message,
  stack: error.stack,
  userId,
});
```

## 🚨 Best Practices

### DO ✅
- Store API credentials securely (encrypted)
- Implement rate limiting
- Handle authentication expiration
- Cache course data to reduce API calls
- Log all API interactions
- Test with sandbox environments
- Provide clear error messages
- Handle network timeouts

### DON'T ❌
- Don't expose API keys in client-side code
- Don't make synchronous API calls
- Don't ignore rate limits
- Don't store plain-text credentials
- Don't trust API responses without validation
- Don't bypass authentication flows
- Don't expose sensitive user data

## 🔒 Security

### Credential Storage
```typescript
// Encrypt API keys before storing
const encryptedKey = encrypt(apiKey, secretKey);
storeInDatabase(userId, { encryptedKey });

// Decrypt when needed
const apiKey = decrypt(storedKey, secretKey);
```

### Token Refresh
```typescript
// Refresh expired tokens
if (isTokenExpired(token)) {
  const newToken = await refreshToken(refreshTokenValue);
  updateStoredToken(newToken);
}
```

### Data Validation
```typescript
// Validate all LMS responses
const schema = z.object({
  id: z.string(),
  name: z.string(),
  courses: z.array(courseSchema),
});

const validatedData = schema.parse(apiResponse);
```

## 🎯 Future Enhancements

- [ ] Real-time webhook support for LMS events
- [ ] Bulk grade import/export
- [ ] Advanced roster management
- [ ] Custom field mapping
- [ ] Multi-LMS simultaneous connections
- [ ] Analytics dashboard for integration health
- [ ] Automated sync scheduling
- [ ] Grade override workflows
- [ ] Assignment rubric sync
- [ ] LTI (Learning Tools Interoperability) support

## 📚 Resources

### Documentation
- [Canvas API](https://canvas.instructure.com/doc/api/)
- [Blackboard API](https://developer.anthology.com/portal/displayApi/Learn)
- [Moodle API](https://docs.moodle.org/dev/Web_services)
- [Google Classroom API](https://developers.google.com/classroom)
- [Schoology API](https://developers.schoology.com/)

### Tools
- [Postman Collections](https://www.postman.com/)
- [API Testing Tools](https://insomnia.rest/)
- [OAuth Debugger](https://oauthdebugger.com/)

## 🔗 Related Files

- `/backend/src/services/lms/lmsFactory.ts` - LMS integration factory
- `/backend/src/routes/lms.ts` - LMS API routes
- `/frontend/src/hooks/useLMS.ts` - LMS React hook
- `/frontend/src/components/LMSIntegration.tsx` - LMS UI component
- `/frontend/src/types/lms.ts` - LMS TypeScript types

## 📞 Support

For LMS integration support:
- 📧 Email: lms-support@learnsynth.com
- 📚 Documentation: https://docs.learnsynth.com/lms
- 💬 Community: https://community.learnsynth.com
- 🐛 Issues: https://github.com/learnsynth/lms-issues

---

**LearnSynth LMS Integrations** - Connecting education technology seamlessly 🎓
