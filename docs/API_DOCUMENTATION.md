# API Documentation

**LearnSynth Knowledge Base & RAG System API**
**Version:** 1.0.0
**Last Updated:** 2025-11-14

---

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Error Handling](#error-handling)
- [Knowledge Bases (Subjects)](#knowledge-bases-subjects)
- [Analytics](#analytics)
- [RAG Search](#rag-search)
- [Documents](#documents)
- [Enhanced Lessons](#enhanced-lessons)
- [Embedding Management](#embedding-management)
- [Search Tracking](#search-tracking)

---

## Authentication

All API endpoints require authentication using Bearer token.

**Header:**
```
Authorization: Bearer <your-jwt-token>
```

**Token Storage:** Tokens are stored in localStorage on the frontend.

---

## Base URL

```
http://localhost:4000/api
```

---

## Error Handling

All endpoints return consistent error responses:

**Error Response Format:**
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Knowledge Bases (Subjects)

### GET /subjects

Retrieve all knowledge bases for the authenticated user.

**Response:**
```json
{
  "subjects": [
    {
      "id": "uuid",
      "name": "Computer Science",
      "description": "Study of computation and algorithms",
      "color": "#6366f1",
      "is_favorite": true,
      "created_at": "2025-11-14T10:00:00Z",
      "updated_at": "2025-11-14T10:00:00Z"
    }
  ]
}
```

### POST /subjects

Create a new knowledge base.

**Request Body:**
```json
{
  "name": "New Subject",
  "description": "Description",
  "color": "#6366f1"
}
```

**Response:**
```json
{
  "subject": {
    "id": "uuid",
    "name": "New Subject",
    "description": "Description",
    "color": "#6366f1",
    "is_favorite": false,
    "created_at": "2025-11-14T10:00:00Z",
    "updated_at": "2025-11-14T10:00:00Z"
  }
}
```

### GET /subjects/:id

Retrieve a specific knowledge base with its documents.

**Response:**
```json
{
  "subject": {
    "id": "uuid",
    "name": "Computer Science",
    "description": "Study of computation and algorithms",
    "color": "#6366f1",
    "is_favorite": true,
    "created_at": "2025-11-14T10:00:00Z",
    "updated_at": "2025-11-14T10:00:00Z"
  },
  "documents": [
    {
      "id": "uuid",
      "title": "Introduction to Algorithms",
      "file_type": "pdf",
      "file_size": 2048576,
      "upload_status": "completed",
      "created_at": "2025-11-14T10:00:00Z",
      "chapters": [
        {
          "id": "uuid",
          "chapter_number": 1,
          "title": "Chapter 1",
          "word_count": 1500
        }
      ]
    }
  ]
}
```

### PUT /subjects/:id

Update a knowledge base.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#8b5cf6"
}
```

**Response:**
```json
{
  "subject": {
    "id": "uuid",
    "name": "Updated Name",
    "description": "Updated description",
    "color": "#8b5cf6",
    "is_favorite": false,
    "updated_at": "2025-11-14T10:00:00Z"
  }
}
```

### DELETE /subjects/:id

Delete a knowledge base.

**Response:**
```json
{
  "message": "Knowledge base deleted successfully"
}
```

### POST /subjects/:id/favorite

Toggle favorite status of a knowledge base.

**Request Body:**
```json
{
  "isFavorite": true
}
```

**Response:**
```json
{
  "subject": {
    "id": "uuid",
    "is_favorite": true
  }
}
```

### GET /subjects/:id/stats

Get statistics for a knowledge base.

**Response:**
```json
{
  "documentCount": 5,
  "chapterCount": 23,
  "favoriteCount": 12,
  "totalViews": 145,
  "recentActivity": [
    {
      "type": "search",
      "timestamp": "2025-11-14T10:00:00Z"
    }
  ]
}
```

### GET /subjects/:id/available-documents

Get documents not yet in the knowledge base.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Available Document",
      "file_type": "pdf",
      "file_size": 1048576,
      "upload_status": "completed",
      "created_at": "2025-11-14T10:00:00Z"
    }
  ]
}
```

### POST /subjects/:id/add-document

Add a document to the knowledge base.

**Request Body:**
```json
{
  "documentId": "uuid"
}
```

**Response:**
```json
{
  "message": "Document added successfully"
}
```

### DELETE /subjects/:id/documents/:docId

Remove a document from the knowledge base.

**Response:**
```json
{
  "message": "Document removed successfully"
}
```

---

## Analytics

### GET /analytics/kb/:id/usage

Get usage analytics for a knowledge base.

**Response:**
```json
{
  "totalLessons": 42,
  "totalViews": 128,
  "averageViewDuration": 1800,
  "teachingStyleDistribution": {
    "visual": 35,
    "auditory": 28,
    "kinesthetic": 22,
    "reading": 15
  },
  "recentActivity": [
    {
      "date": "2025-11-14",
      "lessons": 3,
      "views": 12
    }
  ]
}
```

### GET /analytics/kb/:id/popular-content

Get popular content within a knowledge base.

**Response:**
```json
{
  "documents": [
    {
      "documentId": "uuid",
      "title": "Popular Document",
      "viewCount": 45,
      "lessonCount": 12,
      "searchCount": 23
    }
  ]
}
```

### GET /analytics/kb/:id/embeddings-stats

Get embedding coverage statistics.

**Response:**
```json
{
  "totalDocuments": 5,
  "totalChapters": 23,
  "totalChunks": 234,
  "embeddedChunks": 198,
  "coveragePercentage": 84.6,
  "embeddingModel": "text-embedding-3-small"
}
```

---

## RAG Search

### GET /subjects/search

Search across all knowledge bases (global search).

**Query Parameters:**
- `q` (required) - Search query
- `limit` (optional) - Number of results (default: 10)
- `minScore` (optional) - Minimum relevance score (default: 0.7)

**Response:**
```json
{
  "results": [
    {
      "content": "Search result content...",
      "documentId": "uuid",
      "documentTitle": "Document Title",
      "chapterId": "uuid",
      "chapterTitle": "Chapter Title",
      "subjectId": "uuid",
      "subjectName": "Knowledge Base Name",
      "relevanceScore": 0.85,
      "highlights": [
        {
          "highlight": "matched text",
          "score": 0.85
        }
      ]
    }
  ],
  "totalResults": 42,
  "searchTimeMs": 145,
  "subjects": [
    {
      "subjectId": "uuid",
      "subjectName": "Computer Science",
      "resultCount": 15
    }
  ]
}
```

### GET /subjects/:id/search

Search within a specific knowledge base.

**Query Parameters:**
- `q` (required) - Search query
- `limit` (optional) - Number of results (default: 10)
- `minScore` (optional) - Minimum relevance score (default: 0.7)

**Response:**
```json
{
  "results": [
    {
      "content": "Search result content...",
      "documentId": "uuid",
      "documentTitle": "Document Title",
      "chapterId": "uuid",
      "chapterTitle": "Chapter Title",
      "subjectId": "uuid",
      "subjectName": "Computer Science",
      "relevanceScore": 0.85,
      "highlights": [
        {
          "highlight": "matched text",
          "score": 0.85
        }
      ]
    }
  ],
  "totalResults": 23,
  "searchTimeMs": 89
}
```

---

## Documents

### GET /documents/:id

Get document details.

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Document Title",
    "file_type": "pdf",
    "file_size": 2097152,
    "upload_status": "completed",
    "created_at": "2025-11-14T10:00:00Z",
    "metadata": {}
  }
}
```

### GET /documents/:id/chapters

Get all chapters for a document.

**Response:**
```json
{
  "chapters": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "chapter_number": 1,
      "title": "Chapter 1: Introduction",
      "content": "Chapter content...",
      "word_count": 1500,
      "created_at": "2025-11-14T10:00:00Z"
    }
  ]
}
```

---

## Enhanced Lessons

### POST /lessons/generate

Generate a new enhanced lesson using RAG.

**Request Body:**
```json
{
  "documentId": "uuid",
  "chapterId": "uuid",
  "teachingStyle": "visual" | "auditory" | "kinesthetic" | "reading",
  "includeKBContext": true,
  "knowledgeBaseIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Enhanced Lesson Title",
    "content": "Lesson content...",
    "teachingStyle": "visual",
    "knowledgeBaseContext": {
      "context": "RAG-retrieved context...",
      "sources": [
        {
          "documentId": "uuid",
          "documentTitle": "Source Document",
          "chapterId": "uuid",
          "chapterTitle": "Source Chapter"
        }
      ]
    },
    "created_at": "2025-11-14T10:00:00Z"
  }
}
```

### GET /lessons/:id

Get an existing lesson.

**Response:**
```json
{
  "lesson": {
    "id": "uuid",
    "title": "Lesson Title",
    "content": "Lesson content...",
    "teachingStyle": "visual",
    "knowledgeBaseContext": {
      "context": "Context from KB...",
      "sources": []
    },
    "created_at": "2025-11-14T10:00:00Z"
  }
}
```

---

## Embedding Management

### POST /embeddings/generate/:documentId

Generate embeddings for a document.

**Response:**
```json
{
  "success": true,
  "embedded": 45,
  "total": 50,
  "errors": []
}
```

### GET /embeddings/stats/:documentId

Get embedding statistics for a document.

**Response:**
```json
{
  "documentId": "uuid",
  "totalChunks": 50,
  "embeddedChunks": 45,
  "coveragePercentage": 90.0,
  "lastUpdated": "2025-11-14T10:00:00Z"
}
```

---

## Search Tracking

### POST /search/track

Track a search query.

**Request Body:**
```json
{
  "subjectId": "uuid",
  "searchQuery": "search term",
  "resultsCount": 10,
  "resultsClicked": 2,
  "searchType": "kb_specific",
  "responseTimeMs": 145
}
```

**Response:**
```json
{
  "message": "Search tracked successfully"
}
```

---

## Response Time Expectations

- **Simple queries:** < 200ms
- **RAG search:** 100-500ms (depending on content size)
- **Complex aggregations:** 500-2000ms

---

## Rate Limiting

Currently, there are no rate limits implemented. In production:
- Search endpoints: 100 requests/hour per user
- Embedding generation: 10 requests/hour per user

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Fetch knowledge bases
const response = await fetch('http://localhost:4000/api/subjects', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Search within KB
const searchResponse = await fetch(
  `http://localhost:4000/api/subjects/${subjectId}/search?q=query`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const results = await searchResponse.json();
```

### cURL

```bash
# Get all knowledge bases
curl -X GET http://localhost:4000/api/subjects \
  -H "Authorization: Bearer <token>"

# Create a knowledge base
curl -X POST http://localhost:4000/api/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Subject", "description": "Description"}'

# Search
curl -X GET "http://localhost:4000/api/subjects/search?q=machine%20learning" \
  -H "Authorization: Bearer <token>"
```

---

## Changelog

### v1.0.0 (2025-11-14)
- Initial API release
- Knowledge base management endpoints
- RAG search functionality
- Analytics endpoints
- Embedding management
- Search tracking

---

## Support

For API support and questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/learnsynth/issues)
- Documentation: [Full Documentation](https://docs.learnsynth.com)
- Email: support@learnsynth.com

---

## License

Copyright © 2025 LearnSynth. All rights reserved.
