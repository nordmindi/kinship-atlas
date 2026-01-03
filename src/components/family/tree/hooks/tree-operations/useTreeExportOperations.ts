
import { useCallback } from 'react';
import { useTreeView } from '../../context/TreeViewContext';
import { toast } from '@/hooks/use-toast';
import { toPng, toSvg, toJpeg } from 'html-to-image';
import { FamilyMember } from '@/types';

export function useTreeExportOperations(familyMembers: FamilyMember[] = []) {
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

  // Export as SVG
  const handleExportSVG = useCallback(async () => {
    if (!reactFlowInstance) {
      toast({
        title: "Error",
        description: "Family tree not ready for export",
        variant: "destructive"
      });
      return;
    }

    try {
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) {
        throw new Error('Could not find family tree viewport');
      }

      const dataUrl = await toSvg(viewport as HTMLElement, {
        backgroundColor: '#ffffff',
        width: viewport.getBoundingClientRect().width,
        height: viewport.getBoundingClientRect().height,
      });

      const link = document.createElement('a');
      link.download = `family-tree-${new Date().toISOString().split('T')[0]}.svg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Family tree exported as SVG",
      });
    } catch (error) {
      console.error('SVG export failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not export family tree as SVG",
        variant: "destructive"
      });
    }
  }, [reactFlowInstance]);

  // Export as high-resolution PNG
  const handleExportHighResPNG = useCallback(async (scale: number = 2) => {
    if (!reactFlowInstance) {
      toast({
        title: "Error",
        description: "Family tree not ready for export",
        variant: "destructive"
      });
      return;
    }

    try {
      const viewport = document.querySelector('.react-flow__viewport');
      if (!viewport) {
        throw new Error('Could not find family tree viewport');
      }

      const rect = viewport.getBoundingClientRect();
      const dataUrl = await toPng(viewport as HTMLElement, {
        backgroundColor: '#ffffff',
        width: rect.width * scale,
        height: rect.height * scale,
        style: {
          transform: 'scale(' + scale + ')',
          transformOrigin: 'top left',
        }
      });

      const link = document.createElement('a');
      link.download = `family-tree-hd-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: `Family tree exported as high-resolution PNG (${scale}x)`,
      });
    } catch (error) {
      console.error('High-res PNG export failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not export family tree",
        variant: "destructive"
      });
    }
  }, [reactFlowInstance]);

  // Export as GEDCOM format
  const handleExportGEDCOM = useCallback(async () => {
    try {
      // GEDCOM format structure
      let gedcom = '0 HEAD\n1 SOUR KINSHIP-ATLAS\n2 VERS 1.0\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n';
      gedcom += '1 CHAR UTF-8\n';
      gedcom += '0 @SUBM@ SUBM\n1 NAME Kinship Atlas\n';
      
      // Add each family member
      familyMembers.forEach((member, index) => {
        const id = `@I${index + 1}@`;
        gedcom += `0 ${id} INDI\n`;
        gedcom += `1 NAME ${member.firstName} /${member.lastName}/\n`;
        
        if (member.birthDate) {
          const birthDate = new Date(member.birthDate);
          gedcom += `1 BIRT\n2 DATE ${birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
          if (member.birthPlace) {
            gedcom += `2 PLAC ${member.birthPlace}\n`;
          }
        }
        
        if (member.deathDate) {
          const deathDate = new Date(member.deathDate);
          gedcom += `1 DEAT\n2 DATE ${deathDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
          if (member.deathPlace) {
            gedcom += `2 PLAC ${member.deathPlace}\n`;
          }
        }
        
        gedcom += `1 SEX ${member.gender?.charAt(0).toUpperCase() || 'U'}\n`;
        
        // Add relationships
        member.relations.forEach(rel => {
          if (rel.type === 'spouse') {
            const spouseIndex = familyMembers.findIndex(m => m.id === rel.personId);
            if (spouseIndex >= 0) {
              const familyId = `@F${index + 1}@`;
              gedcom += `1 FAMS ${familyId}\n`;
            }
          }
        });
      });
      
      gedcom += '0 TRLR\n';

      // Create download
      const blob = new Blob([gedcom], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `family-tree-${new Date().toISOString().split('T')[0]}.ged`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Family tree exported as GEDCOM file",
      });
    } catch (error) {
      console.error('GEDCOM export failed:', error);
      toast({
        title: "Export Failed",
        description: "Could not export family tree as GEDCOM",
        variant: "destructive"
      });
    }
  }, [familyMembers]);

  // Print-optimized export
  const handlePrintTree = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please allow popups.",
        variant: "destructive"
      });
      return;
    }

    const viewport = document.querySelector('.react-flow__viewport');
    if (!viewport) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Family Tree - ${new Date().toLocaleDateString()}</title>
          <style>
            body { margin: 0; padding: 20px; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 1cm; }
            }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h1>Family Tree - ${new Date().toLocaleDateString()}</h1>
          <div id="tree-content"></div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    // Export tree as image and add to print window
    toPng(viewport as HTMLElement, {
      backgroundColor: '#ffffff',
    }).then(dataUrl => {
      const img = printWindow.document.createElement('img');
      img.src = dataUrl;
      printWindow.document.getElementById('tree-content')?.appendChild(img);
    });
  }, []);

  return {
    handleExportImage,
    handleExportSVG,
    handleExportHighResPNG,
    handleExportGEDCOM,
    handlePrintTree,
    handleShareTree,
  };
}
