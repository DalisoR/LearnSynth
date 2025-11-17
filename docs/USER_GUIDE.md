# LearnSynth User Guide

**Knowledge Base & RAG-Powered Learning System**
**Version:** 1.0.0
**Date:** 2025-11-14

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Knowledge Base](#creating-your-first-knowledge-base)
3. [Managing Documents](#managing-documents)
4. [Searching Knowledge](#searching-knowledge)
5. [Generating Enhanced Lessons](#generating-enhanced-lessons)
6. [Analytics & Insights](#analytics--insights)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Tips & Best Practices](#tips--best-practices)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Getting Started

Welcome to LearnSynth! This guide will help you make the most of the Knowledge Base and RAG-powered learning system.

### What is a Knowledge Base?

A Knowledge Base (KB) is a curated collection of documents organized around a specific subject or topic. Think of it as your personal library where you can:
- Store documents (PDFs, DOCs, TXTs)
- Search through content using natural language
- Generate AI-enhanced lessons with contextual information
- Track your learning progress and analytics

### Key Features

✅ **Smart Organization** - Group related documents together
✅ **Semantic Search** - Find information using natural language queries
✅ **AI-Enhanced Lessons** - Generate personalized lessons with KB context
✅ **Analytics** - Track usage and popular content
✅ **Favorites** - Quickly access your most important KBs
✅ **Global Search** - Search across all KBs with Cmd/Ctrl + K

---

## Creating Your First Knowledge Base

### Step 1: Navigate to Knowledge Bases
1. Click **"Knowledge"** in the main navigation
2. You'll see the Knowledge Bases dashboard

### Step 2: Create a New Knowledge Base
1. Click the **"+ Create Knowledge Base"** button
2. Fill in the details:
   - **Name** (required): e.g., "Computer Science", "History of Art", "Medical Studies"
   - **Description** (optional): Brief description of the subject
   - **Color**: Choose a color to help visually identify the KB
3. Click **"Create"**

### Step 3: Add Your First Document
1. Click on your newly created Knowledge Base
2. Go to the **"Documents"** tab
3. Click **"Add Document"**
4. Select from your available documents
5. Click **"Add"**

### Step 4: Review the Dashboard
Once you have documents, you'll see:
- **Stats cards** showing document count, chapters, and creation date
- **Document list** with file types, sizes, and chapter information
- **Search tab** for querying your KB

---

## Managing Documents

### Adding Documents to a Knowledge Base

**Option 1: From Knowledge Base Detail Page**
1. Open the KB
2. Click **"Add Document"** button
3. Select document(s) from the available list
4. Click **"Add"**

**Option 2: From Document Overview**
1. Go to **"Documents"** section
2. Click **"Upload Document"** (future feature)
3. The document will be available to add to KBs

### Removing Documents
1. Navigate to the KB containing the document
2. In the document list, click the **trash icon** (🗑️) next to the document
3. Confirm the removal

**Note:** Removing a document from a KB doesn't delete it from your account. The document remains in your library for future use.

### Document Information

Each document displays:
- **Title**: The document name
- **File Type**: PDF, DOC, DOCX, TXT
- **Upload Status**: completed, processing, failed
- **File Size**: Helps you understand storage usage
- **Chapters**: Number of chapters detected
- **Upload Date**: When the document was added
- **Chapter List**: Individual chapters with word counts

### View Modes

Switch between views using the icons in the top right:
- **Grid View** (default): Card-based layout with thumbnails
- **List View**: Compact list with detailed information

### Search Documents
1. Use the search bar to filter documents
2. Search by document title or file type
3. Results update in real-time as you type

---

## Searching Knowledge

### Global Search (Search All KBs)

Press **Cmd/Ctrl + K** (Mac/Windows) to open the global search modal:

1. Type your query in natural language
   - Examples: "What is machine learning?", "How does photosynthesis work?"
2. Results show content from all your KBs
3. Click a result to view it
4. Press **Escape** to close

**Benefits:**
- Search across multiple KBs simultaneously
- Find related content across subjects
- Quick access from anywhere in the app

### KB-Specific Search

1. Open a Knowledge Base
2. Go to the **"Search"** tab
3. Enter your query
4. Results are filtered to that KB only

### Understanding Search Results

Each search result shows:
- **Content Preview**: The relevant text passage
- **Source Information**: Which document and chapter it came from
- **Knowledge Base**: Which KB contains this content
- **Relevance Score**: How well it matches your query (0-1)
- **Highlights**: Matched terms are highlighted

### Search Filters (Advanced)

You can filter search results by:
- **Document**: Specific documents within the KB
- **Date**: When content was added
- **Relevance**: Minimum relevance score

### Best Practices for Searching

✅ **Use natural language** - "What is photosynthesis?" works better than "photosynthesis definition"

✅ **Be specific** - "How do vaccines work?" vs "vaccines"

✅ **Try different phrasings** - If one search doesn't work, rephrase your question

✅ **Use context** - Include relevant details in your query

---

## Generating Enhanced Lessons

### What Are Enhanced Lessons?

Enhanced lessons are AI-generated learning materials that combine:
- Original document content
- Context from your Knowledge Base
- Your preferred teaching style

This creates more comprehensive and personalized learning experiences.

### Creating a Lesson

1. Navigate to **"Workspace"** in the main menu
2. Select a document
3. Click **"Generate Enhanced Lesson"**
4. Configure your lesson:
   - **Knowledge Base Context**: Select KBs to provide additional context
   - **Teaching Style**: Choose from:
     - **Visual**: Diagrams, charts, visual examples
     - **Auditory**: Discussion points, verbal explanations
     - **Kinesthetic**: Hands-on activities, practical exercises
     - **Reading**: Text-heavy with detailed explanations
5. Click **"Generate"**
6. Wait for the AI to process (usually 10-30 seconds)

### Lesson Features

Each generated lesson includes:
- **Title**: Auto-generated based on content
- **Content**: AI-written lesson material
- **Teaching Style**: Tailored to your selected preference
- **KB Context**: Information pulled from your selected KBs
- **Sources**: Citations showing which documents were referenced

### Using KB Context

When you select Knowledge Bases for context:
1. The AI will pull relevant information from those KBs
2. Content is automatically cited with source information
3. This creates more comprehensive and accurate lessons

**Example:**
- Base document: "Introduction to Biology"
- KB Context: "Cell Biology", "Molecular Biology"
- Result: A more comprehensive lesson that connects concepts across documents

---

## Analytics & Insights

### Viewing Analytics

1. Open a Knowledge Base
2. Click the **"Analytics"** tab (or **"View Analytics"** button)

### Available Metrics

**Usage Statistics**
- **Total Lessons**: Number of lessons generated from this KB
- **Total Views**: How many times the KB has been accessed
- **Average View Duration**: Time spent reviewing the KB

**Teaching Style Distribution**
- Pie/bar chart showing which teaching styles are most popular
- Helps you understand your learning preferences

**Popular Content**
- **Top Documents**: Most accessed documents
- **Search Analytics**: Most common searches
- **Recent Activity**: Timeline of KB usage

**Embedding Coverage**
- Shows what percentage of your documents have embeddings
- Higher coverage = better search quality
- Helps you know which documents need attention

### Understanding Embedding Coverage

Embeddings power the semantic search feature:
- **0-30%**: Poor search quality, consider generating more embeddings
- **30-70%**: Good search quality
- **70-100%**: Excellent search quality, all content is searchable

**To improve coverage:**
- Navigate to analytics
- Check which documents have low coverage
- Use the embedding management service (see admin guide)

---

## Keyboard Shortcuts

Master these shortcuts to boost productivity:

| Shortcut | Action |
|----------|--------|
| **Cmd/Ctrl + K** | Open global search |
| **Escape** | Close modal/search |
| **Cmd/Ctrl + N** | Create new knowledge base |
| **Tab** | Navigate between fields |
| **Enter** | Submit form / Select item |
| **Arrow Keys** | Navigate search results |

### Global Search Navigation

When global search is open:
- **↑/↓ Arrow Keys**: Navigate results
- **Enter**: Open selected result
- **Escape**: Close search

---

## Tips & Best Practices

### Organizing Knowledge Bases

**Best Practices:**
1. **Size**: Keep KBs focused (5-20 documents per KB)
   - Too large = harder to search
   - Too small = not enough context

2. **Naming**: Use descriptive names
   - ✅ "Machine Learning Fundamentals"
   - ❌ "Documents"

3. **Color Coding**: Use consistent colors
   - Blue: Technical subjects
   - Green: Science
   - Purple: Arts & Humanities
   - Red: Business

4. **Description**: Add context to help remember purpose
   - Include scope, level, intended use

### Document Management

**Quality Over Quantity:**
- Add documents that you'll actually use
- Remove outdated or redundant documents
- Keep documents organized by KB

**File Naming:**
- Use descriptive document titles
- Include version numbers if relevant
- Keep original filenames for easy identification

### Effective Searching

**Natural Language:**
- Write questions as you would ask a teacher
- Be conversational and specific

**Iterative Searching:**
- Start broad, then narrow down
- Try different phrasings
- Use search results to refine your query

**Combining Searches:**
- Use global search to find related content
- Then use KB-specific search for detailed exploration

### Lesson Generation

**Teaching Style Selection:**
- **Visual Learners**: Choose "Visual" for diagrams and images
- **Auditory Learners**: Choose "Auditory" for discussion-focused content
- **Kinesthetic Learners**: Choose "Kinesthetic" for hands-on activities
- **Reading/Writing Learners**: Choose "Reading" for text-heavy content

**KB Context Selection:**
- Select 2-3 most relevant KBs for best results
- Too many KBs = unfocused content
- Too few KBs = insufficient context

**Iteration:**
- Generate multiple lessons with different styles
- Compare outputs to find what works best
- Adjust KB selections based on results

---

## Troubleshooting

### Common Issues

**"No results found" when searching**
- ✅ Try rephrasing your query
- ✅ Check that documents have embeddings (view analytics)
- ✅ Ensure you're searching in the right KB
- ✅ Try global search instead of KB-specific

**"Low embedding coverage"**
- This means search quality may be poor
- Contact administrator to generate embeddings for your documents

**Lesson generation is slow**
- Normal processing time: 10-30 seconds
- Larger documents take longer
- Be patient, don't refresh the page

**"Document not found"**
- The document may have been deleted
- Check if it's in a different KB
- Try refreshing the page

**Search results seem irrelevant**
- Try different keywords
- Use more specific queries
- Check if embeddings are generated for the documents

### Getting Help

If you encounter issues not covered here:
1. Check the [FAQ section](#faq)
2. View the [API Documentation](./API_DOCUMENTATION.md)
3. Contact support: support@learnsynth.com

---

## FAQ

### General Questions

**Q: What types of documents can I upload?**
A: Currently supports PDF, DOC, DOCX, and TXT files. Maximum file size: 50MB.

**Q: How many Knowledge Bases can I create?**
A: No limit! Create as many as you need to organize your content.

**Q: Can I share my Knowledge Bases with other users?**
A: Currently, Knowledge Bases are private to your account. Sharing features are coming soon.

**Q: Is my data secure?**
A: Yes. All data is encrypted in transit and at rest. We never share your content with third parties.

### Search Questions

**Q: How does semantic search work?**
A: Semantic search uses AI to understand the meaning of your query and finds content that's conceptually related, not just exact keyword matches.

**Q: Why don't all my documents appear in search results?**
A: Only documents with generated embeddings can be searched. Check embedding coverage in analytics.

**Q: Can I search within a specific document?**
A: Yes! Use KB-specific search and filter by that document, or use the document viewer search feature.

### Lesson Generation Questions

**Q: How long does it take to generate a lesson?**
A: Usually 10-30 seconds, depending on document size and selected KB context.

**Q: Can I edit generated lessons?**
A: Yes! Lessons are suggestions. You can copy, modify, and use them however you'd like.

**Q: What's the difference between teaching styles?**
A:
- **Visual**: Emphasizes diagrams, charts, visual examples
- **Auditory**: Focuses on discussion, verbal explanations
- **Kinesthetic**: Includes hands-on activities, practical exercises
- **Reading**: Detailed text with explanations and examples

**Q: Can I use multiple KBs for context?**
A: Yes! Select up to 3 Knowledge Bases for the most comprehensive context.

### Analytics Questions

**Q: What is embedding coverage?**
A: Percentage of your content that has been processed for semantic search. Higher coverage = better search quality.

**Q: How is "popular content" determined?**
A: Based on number of searches, views, and lessons generated from that content.

**Q: Can I export analytics data?**
A: Currently view-only. Export functionality coming soon.

---

## Best Practices Checklist

### When Creating Knowledge Bases
- [ ] Use descriptive, specific names
- [ ] Add helpful descriptions
- [ ] Choose meaningful colors
- [ ] Keep KBs focused (5-20 documents)
- [ ] Group related documents together

### When Adding Documents
- [ ] Ensure documents are relevant to the KB
- [ ] Remove outdated versions
- [ ] Keep high-quality, readable content
- [ ] Verify documents have good structure (chapters, headings)

### When Searching
- [ ] Use natural language questions
- [ ] Be specific and detailed
- [ ] Try different phrasings
- [ ] Use global search for cross-topic exploration
- [ ] Use KB-specific search for deep dives

### When Generating Lessons
- [ ] Choose the right teaching style for your learning preference
- [ ] Select relevant KBs for context (2-3 is optimal)
- [ ] Be patient during generation
- [ ] Review and edit generated content
- [ ] Try different styles to compare

### For Better Search Quality
- [ ] Monitor embedding coverage in analytics
- [ ] Contact admin if coverage is low
- [ ] Organize documents logically
- [ ] Use diverse search approaches

---

## What's Next?

We're constantly improving LearnSynth! Coming soon:

🔄 **Document Upload Integration** - Upload documents directly to KBs
🔄 **Collaborative Knowledge Bases** - Share KBs with classmates
🔄 **Mobile App** - Learn on the go
🔄 **Advanced Analytics** - More detailed usage insights
🔄 **Export Features** - Export lessons and search results
🔄 **Custom Teaching Styles** - Create your own lesson templates
🔄 **Integration APIs** - Connect with other learning tools

---

## Feedback

We value your feedback! Help us improve LearnSynth:

📧 **Email**: feedback@learnsynth.com
🐙 **GitHub**: [Submit issues and feature requests](https://github.com/your-repo/learnsynth/issues)
💬 **Discord**: Join our community server (link coming soon)

---

**Thank you for using LearnSynth!** 🎓

Start building your knowledge bases today and unlock the power of AI-enhanced learning.
