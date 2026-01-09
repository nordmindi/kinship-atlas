import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import ExportFamilyData from '@/components/family/ExportFamilyData';
import { Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ExportFamilyDataPage = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

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

  if (!isAdmin) {
    return (
      <MobileLayout
        currentUser={{
          name: user.email?.split('@')[0] || 'User',
          email: user.email || ''
        }}
        showBackButton
        title="Access Denied"
      >
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              Only administrators can export family data. Please contact an administrator if you need access.
            </p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go Home
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      currentUser={{
        name: user.email?.split('@')[0] || 'User',
        email: user.email || ''
      }}
      showBackButton
      title="Export Family Data"
      icon={<Download className="h-5 w-5" />}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto">
          <ExportFamilyData
            onClose={handleClose}
          />
        </div>
      </div>
    </MobileLayout>
  );
};

export default ExportFamilyDataPage;

