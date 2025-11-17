# LearnSynth Technical Architecture

## System Overview

LearnSynth is a full-stack web application with real-time capabilities, AI integration, and modern web technologies. This document outlines the technical architecture for the implemented and planned features.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React SPA  │  │  Socket.io   │  │ IndexedDB    │     │
│  │   (Vite)     │  │   Client     │  │   (PWA)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│        │                 │                 │               │
│        └─────────────────┴─────────────────┘               │
│                           │                                │
└───────────────────────────┼────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Load         │
                    │   Balancer     │
                    │  (Nginx/Cloud) │
                    └───────┬────────┘
                            │
┌───────────────────────────┼────────────────────────────────┐
│                           │                                │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │                 Backend API                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │   Express    │  │  Socket.io   │  │   Redis   │ │  │
│  │  │   Server     │  │   Server     │  │  (Cache)  │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │         │                 │                 │       │  │
│  │  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼───┐  │  │
│  │  │   Routes    │  │ AI Services │  │ External │  │  │
│  │  │ (REST API)  │  │ (LLM, TTS)  │  │ Services │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────┘  │  │
│  │         │                 │                 │      │  │
│  │  ┌──────▼──────────────────────────────────────┐ │  │
│  │  │        Supabase (PostgreSQL + pgvector)     │ │  │
│  │  │  • User Data   • Chat Messages              │ │  │
│  │  │  • Documents   • Knowledge Base             │ │  │
│  │  │  • Lessons     • Group Data                 │ │  │
│  │  │  • Embeddings  • Study Analytics            │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** Context API + useState/useReducer
- **Routing:** React Router v6
- **UI Components:** Custom components + shadcn/ui
- **Styling:** Tailwind CSS
- **Real-time:** Socket.io Client
- **PWA:** Service Workers + IndexedDB
- **Charts:** Chart.js / Recharts (planned)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js + TypeScript
- **Real-time:** Socket.io
- **Database:** PostgreSQL (Supabase)
- **Vector DB:** pgvector extension
- **Caching:** Redis (planned)
- **Authentication:** Supabase Auth (JWT)
- **File Storage:** Supabase Storage
- **Logging:** Winston

### AI & ML
- **LLM Provider:** OpenAI / Anthropic / Gemini (configurable)
- **Embeddings:** OpenAI text-embedding-3-large
- **TTS:** ElevenLabs (with stub fallback)
- **Speech-to-Text:** Whisper API (planned)

### DevOps & Deployment
- **Database:** Supabase (cloud PostgreSQL)
- **Hosting:** Vercel (frontend) / Railway/Render (backend)
- **CI/CD:** GitHub Actions (planned)
- **Testing:** Playwright (E2E), Jest (unit)
- **Monitoring:** Sentry (error tracking)

---

## Data Flow Architecture

### 1. Document Processing Flow

```
User Uploads Document
        │
        ▼
┌──────────────┐
│   Supabase   │  ← Store file
│   Storage    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Parse      │  ← Extract text, chapters
│  Processor   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Generate    │  ← Generate embeddings
│ Embeddings   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Store in   │  ← Save to pgvector
│ PostgreSQL   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Generate   │  ← AI-enhanced lessons
│   Lessons    │
└──────┬───────┘
       │
       ▼
    Frontend
```

### 2. Real-Time Chat Flow

```
User Sends Message
        │
        ▼
┌──────────────┐
│   Socket.io  │  ← Emit 'group:message'
│   Client     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Socket.io  │  ← Broadcast to room
│   Server     │
└──────┬───────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Database │   │Frontend A│   │Frontend B│
│(Optional)│   │(Update)  │   │(Update)  │
└──────────┘   └──────────┘   └──────────┘
```

### 3. RAG Search Flow

```
User Search Query
        │
        ▼
┌──────────────┐
│  Generate    │  ← Query embedding
│ Embedding    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ pgvector     │  ← Similarity search
│   Search     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Context    │  ← Build context from results
│  Assembly    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     LLM      │  ← Generate response
│ (OpenAI etc)│
└──────┬───────┘
       │
       ▼
    Frontend
```

---

## Database Schema

### Core Tables

```sql
-- Users (Supabase Auth)
auth.users
  └─ Extended via profiles table

-- Documents & Content
documents (id, user_id, title, file_url, file_type, created_at)
chapters (id, document_id, title, content, order_index)
enhanced_lessons (id, chapter_id, teaching_style, content, metadata)

-- Knowledge Base
subjects (id, user_id, name, description, color, created_at)
embeddings (id, subject_id, chunk_text, embedding, metadata)

-- Chat & Groups
study_groups (id, owner_id, name, privacy, settings)
group_members (id, group_id, user_id, role, joined_at)
group_chat_messages (id, group_id, user_id, message, created_at)
user_presence (user_id, status, last_seen_at, current_activity)

-- Learning & Assessment
quizzes (id, subject_id, title, settings)
quiz_results (id, user_id, quiz_id, score, answers, created_at)
srs_items (id, user_id, content, difficulty, next_review)

-- Study Planning
study_plans (id, user_id, title, target_completion)
study_sessions (id, user_id, subject_id, duration, completed_at)
study_goals (id, user_id, description, target_date, status)

-- Gamification
achievements (id, title, description, icon, criteria)
user_achievements (id, user_id, achievement_id, earned_at)
learning_streaks (id, user_id, current_streak, longest_streak)

-- Analytics
learning_analytics (id, user_id, metric_type, value, date)
study_analytics (id, user_id, total_time, sessions_count, average_score)
```

### Planned Tables (Phase 2-5)

```sql
-- Learning Paths (Phase 2)
learning_paths (id, user_id, title, description, difficulty)
path_nodes (id, path_id, subject_id, order_index, prerequisites)
knowledge_gaps (id, user_id, subject_id, topic, severity, identified_at)

-- Video Lectures (Phase 4)
video_lectures (id, subject_id, title, file_url, duration, thumbnail_url)
video_transcripts (id, video_id, timestamp, text, speaker)

-- Enhanced Features (Phase 5)
group_notes (id, group_id, title, content, created_by, updated_at)
practice_problems (id, subject_id, topic, difficulty, problem_text, solution)
mind_maps (id, subject_id, data, created_by) -- JSON structure
```

---

## API Design

### RESTful Endpoints

```
Authentication
POST   /api/auth/signin
POST   /api/auth/signup
POST   /api/auth/signout
GET    /api/auth/me

Documents
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
DELETE /api/documents/:id
GET    /api/documents/:id/chapters

Knowledge Base
GET    /api/subjects
POST   /api/subjects
GET    /api/subjects/:id
PUT    /api/subjects/:id
DELETE /api/subjects/:id
POST   /api/subjects/:id/upload
GET    /api/subjects/:id/search?q=query

Lessons
GET    /api/lessons/:chapterId
POST   /api/lessons/generate

Chat
GET    /api/chat/sessions
POST   /api/chat/sessions
POST   /api/chat/sessions/:id/messages
GET    /api/chat/sessions/:id/messages

Groups
GET    /api/groups
POST   /api/groups
GET    /api/groups/:id
PUT    /api/groups/:id
DELETE /api/groups/:id
GET    /api/groups/:id/members
POST   /api/groups/:id/members
GET    /api/groups/:id/messages  (historical)

Study Planning
GET    /api/study-plans
POST   /api/study-plans
GET    /api/study-sessions
POST   /api/study-sessions
POST   /api/study-pomodoro/start
PUT    /api/study-pomodoro/:id/stop

Analytics
GET    /api/analytics/overview
GET    /api/analytics/progress
GET    /api/study-analytics/:userId
```

### WebSocket Events (Socket.io)

```
User Registration
'user:register'          → { userId }
'user:status'            ← { userId, status }

Group Events
'group:join'             → { groupId, userId }
'group:leave'            → { groupId, userId }
'user:joined'            ← { userId, timestamp }
'user:left'              ← { userId, timestamp }
'group:online-users'     ← { users: [userIds] }

Chat Events
'group:message'          → { groupId, userId, userName, message }
'group:message'          ← { id, groupId, userId, userName, message, timestamp }
'group:typing'           → { groupId, userId, userName, isTyping }
'group:typing'           ← { userId, userName, isTyping }

Collaborative Editing
'note:update'            → { noteId, content, userId, cursorPosition }
'note:remote-update'     ← { noteId, content, userId, cursorPosition, timestamp }
'note:cursor'            → { noteId, userId, userName, position }
'note:remote-cursor'     ← { noteId, userId, userName, position }

Presence
'user:online'            ← { userId }
'user:offline'           ← { userId }
```

---

## Security Architecture

### Authentication & Authorization

```
1. User signs in
   └─> Supabase Auth (JWT token)
        └─> Token stored in httpOnly cookie
             └─> Attached to all requests

2. API Request
   ├─> Verify JWT token
   ├─> Check RLS policies
   └─> Grant/deny access

3. Real-time Connection
   ├─> Send token on connection
   ├─> Verify user identity
   ├─> Join rooms based on permissions
   └─> Enforce room access controls
```

### Row Level Security (RLS)

```sql
-- Example: Users can only access their own documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

-- Example: Group members can see group messages
CREATE POLICY "Group members can view messages"
  ON group_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_chat_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );
```

### Data Protection

- **Encryption at Rest:** Supabase handles automatically
- **Encryption in Transit:** HTTPS/WSS for all connections
- **Input Sanitization:** Sanitize user input before storage
- **XSS Prevention:** React escapes by default
- **CSRF Protection:** JWT in httpOnly cookies
- **Rate Limiting:** 100 requests/15min per IP
- **CORS:** Strict origin whitelist

---

## Performance Optimization

### Caching Strategy

```
L1 Cache (Browser)
├─ Static assets (24h)
├─ API responses (5min)
└─ IndexedDB (offline storage)

L2 Cache (Server - Redis)
├─ RAG search results (1h)
├─ AI-generated lessons (24h)
├─ User sessions (24h)
└─ Frequently accessed data (1h)

L3 Cache (Database)
├─ Query result cache
├─ Materialized views
└─ Connection pooling
```

### Database Optimization

```sql
-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chapters_document_id ON chapters(document_id);
CREATE INDEX idx_embeddings_subject_id ON embeddings(subject_id);
CREATE INDEX idx_messages_group_created ON group_chat_messages(group_id, created_at DESC);

-- Vector Index
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Partitioning (for large tables)
CREATE TABLE messages_2024 PARTITION OF group_chat_messages
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Frontend Optimizations

- **Code Splitting:** Lazy load routes/components
- **Image Optimization:** Next-gen formats (WebP, AVIF)
- **Bundle Analysis:** webpack-bundle-analyzer
- **Tree Shaking:** Remove unused code
- **Memoization:** React.memo, useMemo, useCallback
- **Virtual Scrolling:** For large lists
- **Debounced Search:** 300ms delay

---

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer
    │
    ├─ Backend Instance 1
    ├─ Backend Instance 2  ← Sticky sessions for WebSocket
    └─ Backend Instance N
```

**WebSocket Scaling:**
- Use Redis adapter for Socket.io
- Implement sticky sessions
- Message queue for cross-instance communication

### Database Scaling

- **Read Replicas:** Separate read/write workloads
- **Connection Pooling:** PgBouncer
- **Sharding:** By user_id or organization
- **Archival:** Move old data to cold storage

### CDN Strategy

```
User Request
    │
    ▼
┌──────────┐
│   CDN    │  ← Cache static assets globally
│(Cloudflare)
└────┬─────┘
     │
     ├─ Cache Hit → Return immediately
     └─ Cache Miss → Origin server
```

---

## Monitoring & Observability

### Application Monitoring

```typescript
// Error Tracking (Sentry)
try {
  await apiCall();
} catch (error) {
  Sentry.captureException(error);
}

// Performance Monitoring
const performanceTracer = tracer.startSpan('api_call');
await apiCall();
performanceTracer.finish();

// Custom Metrics
logger.info('User action', {
  userId,
  action: 'document_upload',
  fileSize,
  processingTime,
});
```

### Key Metrics to Monitor

- **Response Time:** P95 < 500ms for API
- **WebSocket Connections:** Monitor concurrent connections
- **Database Performance:** Query execution time
- **Error Rate:** < 0.1% for critical paths
- **AI Service Latency:** Track OpenAI API response times
- **User Engagement:** Daily/Monthly active users
- **Feature Usage:** Track feature adoption

---

## Testing Strategy

### Unit Tests (Jest)

```
Services
├─ socketService.test.ts
├─ llmService.test.ts
├─ ragService.test.ts
└─ ...

Components
├─ GroupChatRoom.test.tsx
├─ Logo.test.tsx
└─ ...
```

### Integration Tests

```
API Endpoints
├─ Test auth flow
├─ Test CRUD operations
├─ Test WebSocket events
└─ Test database interactions
```

### E2E Tests (Playwright)

```
User Journeys
├─ Sign up → Create KB → Upload Document → Generate Lesson
├─ Create Group → Join Group → Send Messages
├─ Study Flow → Take Quiz → View Analytics
└─ Real-time Chat → Typing Indicators → Message History
```

### Test Coverage Goals

- **Unit Tests:** 80% code coverage
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user journeys
- **Load Tests:** 1000 concurrent WebSocket connections

---

## Deployment Architecture

### Development

```
Developer Local
    │
    ▼
Git Push
    │
    ▼
GitHub Actions CI
    ├─ Run tests
    ├─ Build app
    └─ Deploy to Staging
```

### Production

```
GitHub Actions
    │
    ├─ Deploy Backend → Railway/Render
    ├─ Deploy Frontend → Vercel
    └─ Run DB Migrations → Supabase
```

**Environment Variables:**
```
Backend
├─ DATABASE_URL
├─ SUPABASE_URL
├─ SUPABASE_ANON_KEY
├─ OPENAI_API_KEY
├─ ELEVENLABS_API_KEY
└─ REDIS_URL

Frontend
├─ VITE_API_URL
├─ VITE_SUPABASE_URL
└─ VITE_SUPABASE_ANON_KEY
```

---

## Future Architecture Considerations

### Microservices Migration

Split into services:
- **Auth Service:** User management
- **Content Service:** Documents, lessons
- **Chat Service:** Real-time messaging
- **AI Service:** LLM, embeddings, TTS
- **Analytics Service:** Metrics, reporting

### Multi-Region Deployment

```
Region 1 (US-East)
├─ Frontend CDN
├─ Backend
└─ Database Replica

Region 2 (EU-West)
├─ Frontend CDN
├─ Backend
└─ Database Replica

Master Database (US-East)
```

### Event-Driven Architecture

```
User Action
    │
    ▼
Message Queue (Redis/SQS)
    │
    ├─ Process AI Request
    ├─ Generate Embeddings
    ├─ Send Notification
    └─ Update Analytics
```

---

## Documentation & Developer Experience

### Code Documentation

- **TypeScript:** Strong typing throughout
- **JSDoc:** For complex functions
- **README:** Setup instructions
- **Architecture Diagrams:** Visual representation

### API Documentation

- **OpenAPI/Swagger:** Auto-generated from routes
- **Postman Collection:** Importable test cases
- **Example Requests:** Common use cases

### Onboarding

1. Clone repository
2. `npm install` in backend and frontend
3. Set up environment variables
4. Apply database migrations
5. Run `npm run dev` in both
6. Read FEATURE_IMPLEMENTATION_SUMMARY.md

---

## Conclusion

This architecture provides a solid foundation for LearnSynth's features:

✅ **Real-time collaboration** via WebSockets
✅ **Scalable** with horizontal scaling capabilities
✅ **Secure** with RLS and JWT authentication
✅ **Performant** with multi-layer caching
✅ **Modern** with React, TypeScript, and PostgreSQL
✅ **AI-powered** with configurable LLM providers
✅ **Extensible** with modular design

The architecture supports the current 31 planned features and is flexible enough for future enhancements like video support, AR/VR learning, and blockchain integration.
