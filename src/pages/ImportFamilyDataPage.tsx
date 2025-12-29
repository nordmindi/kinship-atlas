import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import ImportFamilyData from '@/components/family/ImportFamilyData';
import { Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ImportResult {
  success: boolean;
  imported: {
    members: number;
    relationships: number;
    stories: number;
  };
  errors: string[];
  warnings: string[];
}

const ImportFamilyDataPage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showImportDialog, setShowImportDialog] = useState(true);

  const handleImportComplete = (result: ImportResult) => {
    if (result.success) {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.imported.members} family members, ${result.imported.relationships} relationships, and ${result.imported.stories} stories.`,
      });
      
      // Navigate back to family tree after successful import
      setTimeout(() => {
        navigate('/family-tree');
      }, 2000);
    } else {
      toast({
        title: "Import Completed with Issues",
        description: `Import completed but encountered ${result.errors.length} errors. Check the details for more information.`,
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    navigate('/family-tree');
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-heritage-purple">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MobileLayout 
      currentUser={{ 
        name: user.email?.split('@')[0] || 'User', 
        email: user.email || ''
      }}
      showBackButton
      title="Import Family Data"
      icon={<Upload className="h-5 w-5" />}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <ImportFamilyData 
            onImportComplete={handleImportComplete}
            onClose={handleClose}
          />
        </div>
      </div>
    </MobileLayout>
  );
};

export default ImportFamilyDataPage;
