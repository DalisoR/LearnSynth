import { BookOpen } from 'lucide-react';
import logo from '@/assets/logo.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  useImage?: boolean; // Set to true to use actual logo image
  vertical?: boolean; // Stack logo and text vertically
}

export default function Logo({ className = '', showText = true, size = 'md', useImage = false, vertical = false }: LogoProps) {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-xl' },
    lg: { icon: 'w-18 h-18', text: 'text-2xl' },
    xl: { icon: 'w-24 h-24', text: 'text-3xl' },
    '2xl': { icon: 'w-48 h-48', text: 'text-4xl' },
  };

  const classes = sizeClasses[size];

  // If useImage is true and logo exists, use the image
  if (useImage) {
    return (
      <div className={`flex ${vertical ? 'flex-col' : 'items-center'} ${vertical ? 'items-center gap-0' : 'gap-2'} ${className}`}>
        <img
          src={logo}
          alt="LearnSynth"
          className={`${classes.icon} object-contain`}
          onError={(e) => {
            // Fallback to icon if image fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
        {showText && (
          <h1 className={`${classes.text} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
            LearnSynth
          </h1>
        )}
      </div>
    );
  }

  // Default: icon-based logo
  return (
    <div className={`flex ${vertical ? 'flex-col' : 'items-center'} ${vertical ? 'items-center gap-0' : 'gap-2'} ${className}`}>
      <div className="relative">
        <BookOpen className={`${classes.icon} text-blue-600`} />
        <div className="absolute inset-0 blur-sm opacity-30">
          <BookOpen className={`${classes.icon} text-purple-600`} />
        </div>
      </div>
      {showText && (
        <h1 className={`${classes.text} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
          LearnSynth
        </h1>
      )}
    </div>
  );
}
