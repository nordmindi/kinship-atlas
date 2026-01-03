import React from 'react';

interface ImportProgressBarProps {
  progress: number;
  label?: string;
}

export const ImportProgressBar: React.FC<ImportProgressBarProps> = ({
  progress,
  label = 'Importing data...',
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-heritage-purple h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

