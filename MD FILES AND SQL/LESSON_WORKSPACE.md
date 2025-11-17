# Lesson Workspace - User Guide

## Overview
The Lesson Workspace provides an interactive learning environment where users can browse through document chapters and view AI-generated lessons for each chapter.

## How It Works

### 1. Accessing the Lesson Workspace
- Navigate to "My Books" page
- Click "Open Lesson Workspace" on any completed document

### 2. Layout
The workspace is divided into two main panels:

#### Left Sidebar - Chapter Navigation
- Lists all chapters/topics/units from the document
- Shows chapter number and difficulty badge
- Clickable to select a chapter
- Currently selected chapter is highlighted in blue

#### Right Panel - Lesson Content
- Displays the generated lesson for the selected chapter
- Shows loading indicator while generating
- Displays lesson content with proper formatting
- Includes Previous/Next navigation buttons

### 3. Lesson Generation Flow

```
User Clicks Chapter
    ↓
Show Loading State
    ↓
Call Backend API: POST /api/lessons/chapters/:chapterId/generate
    ↓
AI Generates Enhanced Lesson
    ↓
Display Generated Content
```

### 4. Backend Integration

#### Endpoint: `POST /api/lessons/chapters/:chapterId/generate`

**Request:**
```json
{
  "config": {
    "level": "intermediate",
    "includeVisuals": false,
    "includeAssessments": false,
    "targetTime": 20
  }
}
```

**Response:**
```json
{
  "success": true,
  "chapter": { ... },
  "lesson": {
    "content": {
      "core": "Enhanced lesson content...",
      "intermediate": "Additional content...",
      "advanced": "Advanced material..."
    },
    "title": "Chapter Title",
    "objectives": [ ... ]
  },
  "metadata": { ... }
}
```

### 5. Frontend Components

#### File Structure:
```
frontend/src/pages/
└── LessonWorkspace.tsx     # Main workspace component

frontend/src/services/api/
├── index.ts                # API exports
└── learningApi.ts          # Learning-specific API calls
```

#### Key Functions:
- `fetchChapters()` - Load all chapters for the document
- `handleChapterSelect()` - Generate and display lesson for selected chapter
- `learningApi.generateLesson()` - Call backend lesson generation API

### 6. User Experience

1. **Initial Load**
   - Workspace opens with chapter list on left
   - First chapter is automatically selected
   - Loading indicator appears while generating first lesson

2. **Chapter Navigation**
   - Click any chapter in the left sidebar
   - Loading indicator shows "Generating Enhanced Lesson..."
   - Lesson content appears on the right

3. **Lesson Viewing**
   - Read the generated lesson content
   - Use Previous/Next buttons to navigate between chapters
   - "Back to Documents" button to return to book list

### 7. Features

✅ **Chapter List Display**
- All chapters shown in order
- Difficulty level badges (Beginner/Intermediate/Advanced)
- Visual indication of selected chapter

✅ **AI Lesson Generation**
- On-demand generation per chapter
- Loading states with progress indication
- Fallback to original content if generation fails

✅ **Navigation**
- Previous/Next chapter buttons
- Disabled states for first/last chapters
- Back to Documents button

✅ **Responsive Design**
- Works on desktop and tablet
- Clean, minimal interface
- Easy to read formatting

### 8. Future Enhancements

🔄 **Planned Features:**
- Quiz generation and interactive assessments
- Progress tracking and bookmarks
- Lesson notes and highlights
- Visual aids and diagrams
- Chapter completion status

### 9. Technical Details

**Dependencies:**
- React 18
- React Router DOM
- Lucide React (icons)
- Fetch API for backend communication

**State Management:**
- `chapters` - Array of chapter objects
- `selectedChapter` - Currently displayed chapter
- `generatingLesson` - Loading state boolean
- `loading` - Initial data load state

**Error Handling:**
- Graceful fallback to original chapter content
- Console error logging
- No disruptive error messages to user
