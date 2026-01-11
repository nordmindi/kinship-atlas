import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding, updateOnboardingEnabled, resetOnboarding } from '@/services/userService';
import { toast } from '@/hooks/use-toast';

export const useOnboarding = () => {
  const { userProfile, refreshUserProfile, isEditor } = useAuth();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = () => {
      setIsChecking(true);
      
      if (!userProfile) {
        setShouldShowOnboarding(false);
        setIsChecking(false);
        return;
      }

      // Only show onboarding for editor role users
      if (!isEditor) {
        setShouldShowOnboarding(false);
        setIsChecking(false);
        return;
      }

      // Show onboarding if:
      // 1. User hasn't completed onboarding AND
      // 2. Onboarding is enabled
      const show = 
        !userProfile.onboardingCompleted && 
        (userProfile.onboardingEnabled ?? true);

      setShouldShowOnboarding(show);
      setIsChecking(false);
    };

    checkOnboardingStatus();
  }, [userProfile, isEditor]);

  const markOnboardingComplete = async () => {
    try {
      const result = await completeOnboarding();
      if (result.success) {
        await refreshUserProfile();
        setShouldShowOnboarding(false);
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete onboarding',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleOnboardingEnabled = async (enabled: boolean) => {
    try {
      const result = await updateOnboardingEnabled(enabled);
      if (result.success) {
        await refreshUserProfile();
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update onboarding setting',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error updating onboarding setting:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  const restartOnboarding = async () => {
    try {
      const result = await resetOnboarding();
      if (result.success) {
        await refreshUserProfile();
        setShouldShowOnboarding(true);
        return true;
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reset onboarding',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    shouldShowOnboarding,
    isChecking,
    isOnboardingCompleted: userProfile?.onboardingCompleted ?? false,
    isOnboardingEnabled: userProfile?.onboardingEnabled ?? true,
    markOnboardingComplete,
    toggleOnboardingEnabled,
    restartOnboarding,
  };
};
