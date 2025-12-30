
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FamilyTreeProvider } from "@/contexts/FamilyTreeContext";
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
import AuthTestPage from "./pages/AuthTestPage";
import UserProfilePage from "./pages/UserProfilePage";
import LogoutTestPage from "./pages/LogoutTestPage";
import AdminPage from "./pages/AdminPage";
import RoleSystemTestPage from "./pages/RoleSystemTestPage";
import ImportFamilyDataPage from "./pages/ImportFamilyDataPage";
import ExportFamilyDataPage from "./pages/ExportFamilyDataPage";
import LegacyStoriesPage from "./pages/LegacyStoriesPage";
import StoryDetailPage from "./pages/StoryDetailPage";

const queryClient = new QueryClient();

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
            <Route path="/auth-test" element={<AuthTestPage />} />
            <Route path="/logout-test" element={<LogoutTestPage />} />
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
              <Route path="/role-test" element={<RoleSystemTestPage />} />
            <Route path="/import-family-data" element={<ImportFamilyDataPage />} />
            <Route path="/export-family-data" element={<ExportFamilyDataPage />} />
            <Route path="/legacy-stories" element={<LegacyStoriesPage />} />
            <Route path="/story/:id" element={<StoryDetailPage />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FamilyTreeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
