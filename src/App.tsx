
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FamilyTreeProvider } from "@/contexts/FamilyTreeContext";
import { queryClient } from "@/lib/queryClient";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AddFamilyMemberPage from "./pages/AddFamilyMemberPage";
import EditFamilyMemberPage from "./pages/EditFamilyMemberPage";
import AddStoryPage from "./pages/AddStoryPage";
import FamilyMemberDetailPage from "./pages/FamilyMemberDetailPage";
import FamilyTreeViewPage from "./pages/FamilyTreeViewPage";
import FamilyMapPage from "./pages/FamilyMapPage";
import AddRelationPage from "./pages/AddRelationPage";
import MediaGalleryPage from "./pages/MediaGalleryPage";
import UserProfilePage from "./pages/UserProfilePage";
import AdminPage from "./pages/AdminPage";
import ImportFamilyDataPage from "./pages/ImportFamilyDataPage";
import ExportFamilyDataPage from "./pages/ExportFamilyDataPage";
import LegacyStoriesPage from "./pages/LegacyStoriesPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import FamilyGroupsPage from "./pages/FamilyGroupsPage";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <FamilyTreeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/add-family-member" element={<AddFamilyMemberPage />} />
            <Route path="/edit-family-member/:id" element={<EditFamilyMemberPage />} />
            <Route path="/family-member/:id" element={<FamilyMemberDetailPage />} />
            <Route path="/add-story" element={<AddStoryPage />} />
            <Route path="/add-relation/:id/:type" element={<AddRelationPage />} />
            <Route path="/family-tree" element={<FamilyTreeViewPage />} />
            <Route path="/map" element={<FamilyMapPage />} />
            <Route path="/stories" element={<Index />} />
            <Route path="/albums" element={<MediaGalleryPage />} />
              <Route path="/timeline" element={<Index />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
            <Route path="/import-family-data" element={<ImportFamilyDataPage />} />
            <Route path="/export-family-data" element={<ExportFamilyDataPage />} />
            <Route path="/legacy-stories" element={<LegacyStoriesPage />} />
            <Route path="/story/:id" element={<StoryDetailPage />} />
            <Route path="/family-groups" element={<FamilyGroupsPage />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FamilyTreeProvider>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
