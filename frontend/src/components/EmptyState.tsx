import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  MessageSquare,
  Calendar,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  actionButton
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md">{description}</p>
      {actionButton ? (
        actionButton
      ) : actionLabel && actionLink ? (
        <Link to={actionLink}>
          <Button onClick={onAction} className="flex items-center gap-2">
            {actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      ) : actionLabel && onAction ? (
        <Button onClick={onAction} className="flex items-center gap-2">
          {actionLabel}
          <ArrowRight className="w-4 h-4" />
        </Button>
      ) : null}
    </div>
  );
};

export const EmptyDocuments: React.FC = () => {
  return (
    <EmptyState
      icon={<BookOpen className="w-10 h-10 text-gray-400" />}
      title="No Documents Yet"
      description="Upload your textbooks, PDFs, or documents to get started with AI-powered learning."
      actionLabel="Upload Your First Document"
      actionLink="/books"
    />
  );
};

export const EmptyKnowledgeBase: React.FC = () => {
  return (
    <EmptyState
      icon={<Brain className="w-10 h-10 text-gray-400" />}
      title="No Knowledge Bases"
      description="Create a knowledge base to organize your learning materials and get personalized AI assistance."
      actionLabel="Create Knowledge Base"
      actionLink="/knowledge"
    />
  );
};

export const EmptyChat: React.FC = () => {
  return (
    <EmptyState
      icon={<MessageSquare className="w-10 h-10 text-gray-400" />}
      title="Start a Conversation"
      description="Ask questions, get explanations, or discuss concepts with your AI tutor."
      actionLabel="Start Chatting"
      actionLink="/chat"
    />
  );
};

export const EmptyStudyPlan: React.FC = () => {
  return (
    <EmptyState
      icon={<Calendar className="w-10 h-10 text-gray-400" />}
      title="No Study Sessions"
      description="Set up your study schedule with our Pomodoro timer and stay focused."
      actionLabel="Start Planning"
      actionLink="/study"
    />
  );
};

export const EmptyGroups: React.FC = () => {
  return (
    <EmptyState
      icon={<Users className="w-10 h-10 text-gray-400" />}
      title="No Study Groups"
      description="Join or create study groups to collaborate with other learners."
      actionLabel="Create Group"
      actionLink="/groups"
    />
  );
};

export const EmptyFlashcards: React.FC = () => {
  return (
    <EmptyState
      icon={<CreditCard className="w-10 h-10 text-gray-400" />}
      title="No Flashcards Yet"
      description="Create flashcards for effective spaced repetition learning."
      actionLabel="Create Flashcards"
      actionLink="/flashcards"
    />
  );
};

export const EmptyAnalytics: React.FC = () => {
  return (
    <EmptyState
      icon={<BarChart3 className="w-10 h-10 text-gray-400" />}
      title="No Analytics Data"
      description="Start studying to see your progress and learning analytics."
      actionLabel="View Dashboard"
      actionLink="/"
    />
  );
};

export const EmptyMindMaps: React.FC = () => {
  return (
    <EmptyState
      icon={<Sparkles className="w-10 h-10 text-gray-400" />}
      title="No Mind Maps"
      description="Create visual mind maps to better understand and remember concepts."
      actionLabel="Create Mind Map"
      actionLink="/mind-maps"
    />
  );
};

export const EmptyPractice: React.FC = () => {
  return (
    <EmptyState
      icon={<FileText className="w-10 h-10 text-gray-400" />}
      title="No Practice Problems"
      description="Generate AI-powered practice problems to test your knowledge."
      actionLabel="Generate Problems"
      actionLink="/practice-problems"
    />
  );
};

export const EmptyConversations: React.FC = () => {
  return (
    <EmptyState
      icon={<MessageSquare className="w-10 h-10 text-gray-400" />}
      title="No Conversations Yet"
      description="Start chatting with the AI tutor to get personalized help."
      actionLabel="Start New Chat"
      actionLink="/chat"
    />
  );
};