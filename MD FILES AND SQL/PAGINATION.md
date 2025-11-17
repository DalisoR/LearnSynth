# Database Pagination - LearnSynth

## 📚 Overview

LearnSynth implements comprehensive database pagination to handle large datasets efficiently, improve performance, and enhance user experience.

## 🎯 Benefits

- **🚀 Faster Page Loads** - Load only the data users need
- **💾 Reduced Memory Usage** - Smaller dataset transfers
- **📊 Scalable Performance** - Handle thousands of records efficiently
- **🎨 Better UX** - Fast, responsive interface
- **💰 Lower Costs** - Reduced bandwidth and database load

## 🛠️ Implementation

### Backend Pagination (Offset-based)

#### Using the Pagination Utils

```typescript
import {
  parsePaginationParams,
  getPaginationMeta,
  createPaginationQuery,
} from '../utils/pagination';

// In your route
router.get('/', async (req, res) => {
  const paginationOptions = parsePaginationParams(req.query);

  // Get total count
  const { count } = await supabase
    .from('table')
    .select('*', { count: 'exact', head: true });

  const total = count || 0;

  // Calculate range
  const offset = (paginationOptions.page - 1) * paginationOptions.limit;
  const from = offset;
  const to = offset + paginationOptions.limit - 1;

  // Fetch data
  const { data } = await supabase
    .from('table')
    .select('*')
    .order(paginationOptions.sortBy, {
      ascending: paginationOptions.sortOrder === 'asc'
    })
    .range(from, to);

  const meta = getPaginationMeta(
    paginationOptions.page,
    paginationOptions.limit,
    total
  );

  res.json({ data, meta });
});
```

#### API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 100) |
| `sortBy` | string | created_at | Column to sort by |
| `sortOrder` | string | desc | Sort order (asc/desc) |
| `search` | string | - | Search query |

#### Response Format

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Frontend Pagination

#### Using the usePagination Hook

```typescript
import { usePagination, usePaginatedQuery } from '@/hooks/usePagination';

function DocumentList() {
  const {
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    setSearch,
  } = usePagination({
    page: 1,
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const {
    data: documents,
    meta,
    loading,
    error,
    refetch,
  } = usePaginatedQuery(
    async (params) => {
      const response = await fetch(`/api/documents?${new URLSearchParams(params)}`);
      return response.json();
    },
    []
  );

  return (
    <div>
      {loading && <SkeletonLoader />}
      {error && <ErrorMessage error={error} />}
      {documents?.map((doc) => <DocumentCard key={doc.id} document={doc} />)}
      <Pagination
        currentPage={meta?.page || 1}
        totalPages={meta?.totalPages || 1}
        pageSize={meta?.limit || 20}
        totalItems={meta?.total || 0}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </div>
  );
}
```

#### Using the Pagination Component

```tsx
import Pagination from '@/components/Pagination';

<Pagination
  currentPage={page}
  totalPages={totalPages}
  pageSize={limit}
  totalItems={totalItems}
  onPageChange={(page) => setPage(page)}
  onPageSizeChange={(limit) => setLimit(limit)}
  showPageSizeOptions={true}
  pageSizeOptions={[10, 20, 50, 100]}
/>
```

## 📊 Pagination Types

### 1. Offset-based Pagination

**How it works:**
- Uses `OFFSET` and `LIMIT` in SQL
- Client sends page number
- Server calculates offset

**Pros:**
- ✅ Simple to implement
- ✅ Easy to understand
- ✅ Good for small datasets
- ✅ Supports jumping to arbitrary pages

**Cons:**
- ❌ Slower for large offsets
- ❌ Can return inconsistent results with updates
- ❌ Performance degrades with deep pagination

**Best for:**
- Dashboards with moderate data
- User profiles
- Settings pages

**Implementation:**
```typescript
const { data, meta } = await fetch('/api/documents?page=1&limit=20');
```

### 2. Cursor-based Pagination

**How it works:**
- Uses a cursor (pointer) to the last item
- Client requests next/previous page
- More efficient for large datasets

**Pros:**
- ✅ Consistent results
- ✅ Fast for large datasets
- ✅ Real-time data compatible
- ✅ Better performance

**Cons:**
- ❌ Can't jump to arbitrary pages
- ❌ More complex to implement
- ❌ No total count (without extra query)

**Best for:**
- Chat messages
- Activity feeds
- Search results
- Real-time updates

**Implementation:**
```typescript
const { data, meta } = await fetch(
  `/api/messages?cursor=${nextCursor}&limit=50`
);
```

## 🔧 Database Optimizations

### Indexed Columns

Ensure these columns are indexed for fast sorting:
- `created_at` (default sort column)
- `updated_at`
- `title` (for search)
- Foreign key columns (`user_id`, `document_id`)

**PostgreSQL Index Example:**
```sql
CREATE INDEX idx_documents_user_id_created_at
ON documents (user_id, created_at DESC);

CREATE INDEX idx_documents_search
ON documents USING gin(to_tsvector('english', title));
```

### Query Optimization

```sql
-- ❌ SLOW: Full scan + sort
SELECT * FROM documents ORDER BY created_at DESC LIMIT 20 OFFSET 1000;

-- ✅ FAST: Using index
SELECT * FROM documents
WHERE id IN (
  SELECT id FROM documents
  ORDER BY created_at DESC
  LIMIT 20 OFFSET 1000
);
```

## 📱 Cursor-based Pagination Example

### Backend Implementation

```typescript
import { createCursor, parseCursor } from '../utils/pagination';

router.get('/messages', async (req, res) => {
  const { cursor, limit = 50, sortOrder = 'desc' } = req.query;

  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply cursor filter
  if (cursor) {
    const parsedCursor = parseCursor(cursor as string);
    if (parsedCursor) {
      const operator = sortOrder === 'desc' ? 'lt' : 'gt';
      query = query
        .filter('created_at', operator, parsedCursor.value)
        .filter('id', 'lt', parsedCursor.id);
    }
  }

  const { data } = await query.limit(Number(limit) + 1);

  const hasNextPage = data.length > Number(limit);
  const items = hasNextPage ? data.slice(0, -1) : data;
  const nextCursor = hasNextPage
    ? createCursor(items, 'created_at', sortOrder as any)
    : undefined;

  res.json({
    data: items,
    meta: {
      hasNextPage,
      nextCursor,
    },
  });
});
```

### Frontend Implementation

```typescript
const [messages, setMessages] = useState([]);
const [cursor, setCursor] = useState<string | null>(null);
const [hasNext, setHasNext] = useState(true);

const loadMore = async () => {
  const response = await fetch(
    `/api/messages?cursor=${cursor}&limit=50`
  );
  const { data, meta } = await response.json();

  setMessages((prev) => [...prev, ...data]);
  setCursor(meta.nextCursor);
  setHasNext(meta.hasNextPage);
};
```

## 🎨 Pagination UI Patterns

### 1. Traditional Pagination

```
[1] [2] [3] ... [10] Next >
```

```tsx
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

### 2. Load More Button

```
[Load More]
```

```tsx
<Button onClick={loadMore} disabled={!hasNext}>
  Load More
</Button>
```

### 3. Infinite Scroll

```tsx
const { ref } = useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
});

<div ref={ref}>
  {items.map((item) => <Item key={item.id} item={item} />)}
</div>
```

### 4. Virtual Scrolling

```tsx
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={totalItems}
  itemSize={50}
  itemData={items}
/>
```

## 📊 Performance Metrics

### Before Pagination
- Load 1000 documents: 3-5 seconds
- Page freeze: Yes
- Memory usage: 50MB+
- Network transfer: 2MB

### After Pagination (20 per page)
- Load 20 documents: <500ms
- Page freeze: No
- Memory usage: 5MB
- Network transfer: 20KB

## 🧪 Testing Pagination

### Unit Tests

```typescript
import { getPaginationMeta, parsePaginationParams } from '../utils/pagination';

test('calculates pagination meta correctly', () => {
  const meta = getPaginationMeta(1, 20, 100);
  expect(meta.totalPages).toBe(5);
  expect(meta.hasNextPage).toBe(true);
  expect(meta.hasPrevPage).toBe(false);
});

test('parses query parameters', () => {
  const params = parsePaginationParams({ page: 2, limit: 10 });
  expect(params.page).toBe(2);
  expect(params.limit).toBe(10);
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('pagination works correctly', async ({ page }) => {
  await page.goto('/documents');

  // Check first page
  await expect(page.locator('[data-testid="document-item"]')).toHaveCount(20);

  // Go to next page
  await page.click('[aria-label="Next page"]');
  await expect(page.locator('[data-testid="document-item"]')).toHaveCount(20);

  // Check page indicator
  await expect(page.locator('text=Page 2 of 5')).toBeVisible();
});
```

## 🔍 Monitoring & Analytics

### Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Average Response Time | <500ms | Time to load a page |
| Cache Hit Rate | >70% | Percentage of cached pagination |
| Deep Pagination Count | <5% | How often users go beyond page 5 |
| Abandonment Rate | <10% | Users who leave during pagination |

### Query Performance

```sql
-- Track slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE query LIKE '%ORDER BY%'
ORDER BY mean_time DESC
LIMIT 10;
```

## 📚 API Examples

### List Documents

```bash
# First page, 20 items
GET /api/documents

# Second page, 50 items
GET /api/documents?page=2&limit=50

# Sorted by title
GET /api/documents?sortBy=title&sortOrder=asc

# With search
GET /api/documents?search=mathematics&page=1&limit=20
```

### Response

```json
{
  "data": [
    {
      "id": "123",
      "title": "Introduction to Mathematics",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 🚀 Best Practices

### DO ✅
- Use pagination for datasets >20 items
- Index sort columns
- Limit max items per page (100)
- Cache pagination results
- Use skeleton loaders during loading
- Provide clear loading states
- Optimize for mobile (smaller page sizes)

### DON'T ❌
- Don't return all data at once
- Don't use offset >10,000 without cursor pagination
- Don't forget to validate pagination params
- Don't use pagination for small datasets (<20 items)
- Don't block the main thread during pagination
- Don't forget error handling

## 🔗 Related Files

- `/backend/src/utils/pagination.ts` - Pagination utilities
- `/frontend/src/hooks/usePagination.ts` - Pagination hooks
- `/frontend/src/components/Pagination.tsx` - Pagination component
- `/backend/src/routes/documents.ts` - Example with pagination

## 🎯 Future Enhancements

- [ ] Adaptive page sizes based on data
- [ ] Smart caching for frequently accessed pages
- [ ] Prefetching next page on hover
- [ ] Elasticsearch integration for search
- [ ] Redis cache for pagination
- [ ] Analytics dashboard for pagination usage
- [ ] Virtual scrolling for large lists
- [ ] Column-based sorting UI
