import { MessageSquare } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';

export default function ChatView() {
  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 flex items-center gap-2 md:gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <MessageSquare className="w-6 h-6 md:w-9 md:h-9 text-indigo-600" />
          <span>AI Tutor Chat</span>
        </h1>
        <p className="text-gray-600 text-sm md:text-lg">
          Get instant help with your materials or ask any question. Toggle knowledge bases in settings to ground responses in your documents.
        </p>
      </div>

      <ChatInterface />
    </div>
  );
}
