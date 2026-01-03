import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ImportSummaryAlert } from '@/components/molecules/ImportSummaryAlert';

interface ImportResult {
  success: boolean;
  imported: {
    members: number;
    relationships: number;
    stories: number;
    locations: number;
    media: number;
    artifacts: number;
    storyMembers: number;
  };
  errors: string[];
  warnings: string[];
}

interface ImportResultDisplayProps {
  result: ImportResult;
}

export const ImportResultDisplay: React.FC<ImportResultDisplayProps> = ({
  result,
}) => {
  return (
    <div className="mt-6 space-y-4">
      <ImportSummaryAlert
        success={result.success}
        imported={result.imported}
        errorCount={result.errors.length}
      />

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-red-600">Errors:</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.errors.map((error, index) => (
              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-yellow-600">Warnings:</h4>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {result.warnings.map((warning, index) => (
              <div
                key={index}
                className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded"
              >
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

