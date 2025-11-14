import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import { subjectsAPI } from '@/services/api';

export default function ChatView() {
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Ask Your AI Tutor
        </h1>
        <p className="text-gray-600">
          Get instant help with your materials. Ask questions, request explanations, or discuss concepts.
        </p>
      </div>

      <ChatInterface subjectId={selectedSubject || undefined} />
    </div>
  );
}
