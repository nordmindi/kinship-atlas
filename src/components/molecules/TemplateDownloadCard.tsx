import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

interface TemplateDownloadCardProps {
  type: 'json' | 'excel';
  onDownload: (type: 'json' | 'excel') => void;
}

export const TemplateDownloadCard: React.FC<TemplateDownloadCardProps> = ({
  type,
  onDownload,
}) => {
  const isJson = type === 'json';
  const Icon = isJson ? FileText : FileSpreadsheet;
  const title = isJson ? 'JSON Template' : 'Excel Template';
  const description = isJson
    ? 'Download a JSON template file with example data structure.'
    : 'Download an Excel template with multiple sheets for all data types.';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <Button onClick={() => onDownload(type)} variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Download {title}
        </Button>
      </CardContent>
    </Card>
  );
};

