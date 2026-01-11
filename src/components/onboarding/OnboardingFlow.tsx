import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  BookOpen, 
  Archive, 
  Image, 
  Network, 
  ChevronRight, 
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/services/userService';
import { toast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  route?: string; // Optional route to navigate to for this feature
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Kinship Atlas!',
      description: 'Let\'s get you started with your family history journey',
      icon: <CheckCircle2 className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-lg text-center">
            Kinship Atlas helps you preserve and share your family's stories, relationships, and memories.
          </p>
          <div className="bg-heritage-purple-light/10 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-heritage-purple">What you'll learn:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>How to add family members</li>
              <li>How to create relationship stories</li>
              <li>How to add artifacts and media</li>
              <li>How to use the family tree</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'family-members',
      title: 'Add Family Members',
      description: 'Start building your family tree by adding family members',
      icon: <Users className="h-8 w-8 text-primary" />,
      route: '/add-family-member',
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Family members are the foundation of your family tree. You can add:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Basic Information:</strong> Name, birth date, birth place, and biography</li>
            <li><strong>Relationships:</strong> Connect family members as parents, children, spouses, or siblings</li>
            <li><strong>Location Data:</strong> Add birth places and track where family members lived</li>
            <li><strong>Photos:</strong> Upload profile pictures for each family member</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> Start with yourself or a known ancestor, then add relationships to build your tree.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'stories',
      title: 'Create Relationship Stories',
      description: 'Preserve family memories and stories',
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      route: '/add-story',
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Stories help preserve your family's history and memories. You can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Write Stories:</strong> Document important events, memories, or anecdotes</li>
            <li><strong>Link to Family Members:</strong> Connect stories to the people involved</li>
            <li><strong>Add Dates:</strong> Include when events happened for timeline organization</li>
            <li><strong>Attach Media:</strong> Add photos, documents, or other files to your stories</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> Stories can be about anything - weddings, holidays, achievements, or everyday moments that matter.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'artifacts',
      title: 'Add Artifacts',
      description: 'Preserve physical items and heirlooms',
      icon: <Archive className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Artifacts are physical items that hold family significance. You can document:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Heirlooms:</strong> Jewelry, furniture, or other family treasures</li>
            <li><strong>Documents:</strong> Certificates, letters, or important papers</li>
            <li><strong>Photos:</strong> Physical photographs and albums</li>
            <li><strong>Other Items:</strong> Any object with family meaning</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> You can add photos of artifacts and link them to family members or stories.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'media',
      title: 'Upload Media',
      description: 'Add photos, videos, and documents',
      icon: <Image className="h-8 w-8 text-primary" />,
      route: '/albums',
      content: (
        <div className="space-y-4">
          <p className="text-base">
            Media files help bring your family history to life. You can upload:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Photos:</strong> Family pictures, portraits, and event photos</li>
            <li><strong>Videos:</strong> Recorded memories and events</li>
            <li><strong>Audio:</strong> Voice recordings and interviews</li>
            <li><strong>Documents:</strong> Scanned letters, certificates, and records</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> Media can be attached to family members, stories, or artifacts to create rich connections.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'family-tree',
      title: 'Family Tree View',
      description: 'Visualize your family relationships',
      icon: <Network className="h-8 w-8 text-primary" />,
      route: '/family-tree',
      content: (
        <div className="space-y-4">
          <p className="text-base">
            The Family Tree provides a visual representation of your family relationships:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Interactive View:</strong> Navigate and explore your family tree</li>
            <li><strong>Relationship Lines:</strong> See how family members are connected</li>
            <li><strong>Member Profiles:</strong> Click on any member to view their details</li>
            <li><strong>Filtering:</strong> Filter by family groups or search for specific members</li>
          </ul>
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <p className="text-sm">
              <strong>Tip:</strong> The tree automatically updates as you add new family members and relationships.
            </p>
          </div>
        </div>
      )
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();
      if (result.success) {
        toast({
          title: 'Onboarding Complete!',
          description: 'You\'re all set to start building your family history.',
        });
        onComplete();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete onboarding',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleTryFeature = () => {
    const step = steps[currentStep];
    if (step.route) {
      onClose();
      navigate(step.route);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {currentStepData.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <div className="min-h-[300px] py-4">
            {currentStepData.content}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isCompleting}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {currentStepData.route && (
                <Button
                  variant="outline"
                  onClick={handleTryFeature}
                  disabled={isCompleting}
                >
                  Try This Feature
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isCompleting}
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                disabled={isCompleting}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    {isCompleting ? 'Completing...' : 'Get Started'}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
