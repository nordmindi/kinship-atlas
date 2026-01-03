import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileSpreadsheet } from 'lucide-react';

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileAccepted,
  accept = {
    'application/json': ['.json'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    accept,
    maxSize,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-heritage-purple bg-heritage-purple-light'
          : 'border-gray-300 hover:border-heritage-purple'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium mb-2">
        {isDragActive ? 'Drop your file here' : 'Upload Family Data'}
      </h3>
      <p className="text-gray-600 mb-4">
        Drag and drop your file here, or click to select
      </p>
      <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          JSON
        </div>
        <div className="flex items-center gap-1">
          <FileSpreadsheet className="h-4 w-4" />
          Excel/CSV
        </div>
      </div>
    </div>
  );
};

