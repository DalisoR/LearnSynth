# GroupChatRoom Integration Guide

## Quick Integration Steps

### Step 1: Add Chat Tab to GroupDetail

In `frontend/src/pages/GroupDetail.tsx`, find the TabsList section and add a new "chat" tab:

```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="materials">Materials</TabsTrigger>
  <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
  <TabsTrigger value="discussions">Discussions</TabsTrigger>
  <TabsTrigger value="chat">Chat</TabsTrigger>  {/* ADD THIS */}
</TabsList>
```

### Step 2: Add Chat TabContent

After the discussions TabsContent, add:

```tsx
<TabsContent value="chat" className="mt-4">
  <div className="h-[600px]">
    <GroupChatRoom
      groupId={groupId!}
      currentUserId={user?.id || ''}
      currentUserName={user?.email || 'Anonymous'}
    />
  </div>
</TabsContent>
```

### Step 3: Update Grid Columns

Change the TabsList grid from `grid-cols-5` to `grid-cols-5` (already correct) or adjust based on your needs.

## Testing Real-Time Chat

### Prerequisites
1. Backend server running (`cd backend && npm run dev`)
2. Frontend running (`cd frontend && npm run dev`)
3. Database migration applied:
   ```bash
   psql -d your_database -f database/migrations/006_realtime_chat_presence.sql
   ```

### Testing Steps
1. Open the app in two browser windows
2. Join the same group in both windows
3. Send messages in one window
4. Verify they appear in real-time in both windows
5. Test typing indicators
6. Test disconnect/reconnect

## Customization Options

### Change Chat Height
Adjust the container height:
```tsx
<div className="h-[500px]"> {/* Change from 600px to whatever */}</div>
```

### Customize Message Bubbles
In `GroupChatRoom.tsx`, modify the message bubble styles:
```tsx
<div className={`max-w-[70%] rounded-lg px-4 py-2 ${
  msg.userId === currentUserId
    ? 'bg-blue-600 text-white'  // Your outgoing message style
    : 'bg-gray-100 text-gray-900'  // Incoming message style
}`}>
```

### Add Message Reactions
The infrastructure is ready for message reactions. Add to GroupChatRoom:
```tsx
// After message display
<Button size="sm" variant="ghost">👍</Button>
<Button size="sm" variant="ghost">❤️</Button>
```

### Add Message Persistence
Currently messages are ephemeral. To save to database:

1. Add to socketService.ts `group:message` handler:
```typescript
// Save to database
await supabase.from('group_chat_messages').insert({
  group_id: data.groupId,
  user_id: data.userId,
  message: data.message,
  message_type: 'text'
});
```

2. Load historical messages on component mount:
```typescript
const loadMessages = async () => {
  const { data } = await supabase
    .from('group_chat_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(100);
  setMessages(data || []);
};
```

## Advanced Features

### User Avatars
Display user profile pictures in messages:
```tsx
{msg.userId !== currentUserId && (
  <div className="flex items-start gap-2">
    <img src={msg.avatarUrl} className="w-8 h-8 rounded-full" />
    <div className="flex-1">
      {/* Message content */}
    </div>
  </div>
)}
```

### File Sharing
Add file upload capability:
```tsx
<input
  type="file"
  onChange={handleFileUpload}
  accept="image/*,application/pdf"
/>
```

### Message Threading
Add reply functionality:
```tsx
// Add reply_to_id field to message data
{
  message: data.message,
  reply_to_id: data.replyToId,
  // ...
}
```

### Message Search
Add search functionality:
```tsx
<input
  placeholder="Search messages..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

## Troubleshooting

### Socket Not Connecting
1. Check backend is running on port 4000
2. Verify CORS configuration in `socketService.ts`
3. Check browser console for connection errors
4. Ensure `VITE_BACKEND_URL` is set correctly

### Messages Not Appearing
1. Verify WebSocket connection status (green dot indicator)
2. Check console for event handler errors
3. Confirm group ID is correct
4. Verify user is authenticated

### Typing Indicators Not Working
1. Check `typingTimeoutRef` cleanup
2. Verify `group:typing` event is being emitted
3. Check socket connection

## Production Deployment

### Sticky Sessions
For load balancing, configure sticky sessions:

**Nginx:**
```nginx
upstream backend {
  ip_hash;  # or
  sticky cookie srv_id expires=1h domain=.example.com;
}
```

**PM2:**
```bash
pm2 start ecosystem.config.js --instances max --sticky
```

### Rate Limiting
Add rate limiting for WebSocket connections:
```typescript
// In socketService.ts
const rateLimiter = new Map<string, { count: number; reset: number }>();

socket.on('connection', (socket) => {
  const now = Date.now();
  const key = socket.handshake.address;
  const limiter = rateLimiter.get(key) || { count: 0, reset: now + 60000 };

  if (limiter.count >= 100) {  // 100 messages per minute
    socket.disconnect();
    return;
  }

  limiter.count++;
  rateLimiter.set(key, limiter);
});
```

### Monitoring
Add connection monitoring:
```typescript
// In socketService.ts
setInterval(() => {
  logger.info('Socket.io stats', {
    connectedClients: this.getOnlineUserCount(),
    totalGroups: this.groupRooms.size,
  });
}, 60000);  // Every minute
```

## Security Considerations

### RLS Verification
All database access uses Row Level Security. Verify policies are correct:
- Users can only see messages from groups they're members of
- Users can only send messages to groups they belong to
- Users can only update/delete their own messages

### Input Sanitization
Always sanitize user input:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Before saving or displaying
const sanitized = DOMPurify.sanitize(message);
```

### XSS Prevention
React automatically escapes JSX, but for dangerouslySetInnerHTML:
```tsx
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(message) }} />
```

## Performance Optimization

### Message Pagination
Load messages in pages:
```typescript
const loadMoreMessages = async () => {
  const { data } = await supabase
    .from('group_chat_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .range(currentPage * 50, (currentPage + 1) * 50 - 1);
  // Prepend to existing messages
};
```

### Virtual Scrolling
For large chat histories, use react-window:
```tsx
import { FixedSizeList as List } from 'react-window';

<List
  height={600}
  itemCount={messages.length}
  itemSize={80}
  itemData={messages}
>
  {MessageRow}
</List>
```

### Debounced Typing
Already implemented - typing indicator stops after 2 seconds of inactivity.

## Next Steps

1. ✅ Complete integration into GroupDetail
2. ✅ Test real-time functionality
3. ✅ Add message persistence to database
4. ✅ Implement presence indicators (Phase 1.5)
5. ⏭️ Add message reactions
6. ⏭️ Add file sharing
7. ⏭️ Add message search
8. ⏭️ Implement collaborative notes (Phase 1.6)
