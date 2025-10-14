
import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingTreeView: React.FC = () => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-heritage-purple" />
        <p className="mt-2 text-muted-foreground">Loading family tree...</p>
      </div>
    </div>
  );
};

export default LoadingTreeView;
