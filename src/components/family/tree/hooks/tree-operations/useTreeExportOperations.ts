
import { useCallback } from 'react';
import { useTreeView } from '../../context/TreeViewContext';
import { toast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';

export function useTreeExportOperations() {
  const { reactFlowInstance } = useTreeView();

  // Handle export image
  const handleExportImage = useCallback(async () => {
    if (!reactFlowInstance) {
      toast({
        title: "Error",
        description: "Family tree not ready for export",
        variant: "destructive"
      });
      return;
    }

    try {
      // Find the ReactFlow viewport element
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) {
        throw new Error('Could not find family tree viewport');
      }

      // Generate image
      const dataUrl = await toPng(viewport as HTMLElement, {
        backgroundColor: '#ffffff',
        width: viewport.getBoundingClientRect().width,
        height: viewport.getBoundingClientRect().height,
        style: {
          transform: 'none',
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `family-tree-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Family tree exported successfully",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not export family tree. Please try again.",
        variant: "destructive"
      });
    }
  }, [reactFlowInstance]);

  // Handle share tree
  const handleShareTree = useCallback(async () => {
    try {
      const shareData = {
        title: 'My Family Tree',
        text: 'Check out my family tree!',
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Family tree link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share Failed",
        description: "Could not share family tree",
        variant: "destructive"
      });
    }
  }, []);

  return {
    handleExportImage,
    handleShareTree,
  };
}
