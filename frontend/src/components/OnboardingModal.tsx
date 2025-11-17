import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Brain, MessageSquare, Check, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  actionLink: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    title: 'Upload Your First Document',
    description: 'Start by uploading textbooks, PDFs, or study materials to build your personal learning library.',
    icon: <BookOpen className="w-16 h-16" />,
    action: 'Upload Document',
    actionLink: '/books',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    title: 'Create a Knowledge Base',
    description: 'Organize your learning subjects and get AI-powered assistance tailored to each topic.',
    icon: <Brain className="w-16 h-16" />,
    action: 'Create Knowledge Base',
    actionLink: '/knowledge',
    color: 'from-purple-500 to-pink-600',
  },
  {
    title: 'Chat with AI Tutor',
    description: 'Ask questions, get explanations, and have interactive learning sessions with your AI tutor.',
    icon: <MessageSquare className="w-16 h-16" />,
    action: 'Start Chatting',
    actionLink: '/chat',
    color: 'from-emerald-500 to-teal-600',
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    onClose();
  };

  const handleAction = () => {
    const step = steps[currentStep];
    navigate(step.actionLink);
    onClose();
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-blue-600 w-8'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`p-6 rounded-full bg-gradient-to-br ${currentStepData.color} text-white`}>
              {currentStepData.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center mb-4">
            {currentStepData.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-8 max-w-lg mx-auto">
            {currentStepData.description}
          </p>

          {/* Action button */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={handleAction}
              size="lg"
              className="flex items-center gap-2 px-8"
            >
              {currentStepData.action}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            <span className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>

            <Button
              variant="ghost"
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Complete button for last step */}
          {currentStep === steps.length - 1 && (
            <div className="mt-6 pt-6 border-t text-center">
              <Button
                onClick={handleComplete}
                variant="outline"
                className="flex items-center gap-2 mx-auto"
              >
                <Check className="w-4 h-4" />
                Complete Setup
              </Button>
            </div>
          )}

          {/* Skip link */}
          <div className="mt-4 text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};