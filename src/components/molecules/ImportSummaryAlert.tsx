import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ImportSummary {
  members: number;
  relationships: number;
  stories: number;
  locations: number;
  media: number;
  artifacts: number;
  storyMembers: number;
}

interface ImportSummaryAlertProps {
  success: boolean;
  imported: ImportSummary;
  errorCount?: number;
}

export const ImportSummaryAlert: React.FC<ImportSummaryAlertProps> = ({
  success,
  imported,
  errorCount = 0,
}) => {
  return (
    <Alert variant={success ? 'default' : 'destructive'}>
      {success ? (
        <CheckCircle className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertDescription>
        Import completed! {imported.members} members, {imported.relationships}{' '}
        relationships, and {imported.stories} stories imported.
        {errorCount > 0 && ` ${errorCount} errors occurred.`}
      </AlertDescription>
    </Alert>
  );
};

