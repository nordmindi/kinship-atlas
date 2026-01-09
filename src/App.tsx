import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FamilyTreeProvider } from "@/contexts/FamilyTreeContext";
import { TabVisibilityProvider } from "@/components/providers/TabVisibilityProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import AllFamilyMembersPage from "./pages/AllFamilyMembersPage";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <FamilyTreeProvider>
          <TabVisibilityProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected routes - require authentication */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/add-family-member" element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <AddFamilyMemberPage />
                  </ProtectedRoute>
                } />
                <Route path="/edit-family-member/:id" element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <EditFamilyMemberPage />
                  </ProtectedRoute>
                } />
                <Route path="/family-member/:id" element={
                  <ProtectedRoute>
                    <FamilyMemberDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/add-story" element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <AddStoryPage />
                  </ProtectedRoute>
                } />
                <Route path="/add-relation/:id/:type" element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <AddRelationPage />
                  </ProtectedRoute>
                } />
                <Route path="/family-tree" element={
                  <ProtectedRoute>
                    <FamilyTreeViewPage />
                  </ProtectedRoute>
                } />
                <Route path="/family-members" element={
                  <ProtectedRoute>
                    <AllFamilyMembersPage />
                  </ProtectedRoute>
                } />
                <Route path="/map" element={
                  <ProtectedRoute>
                    <FamilyMapPage />
                  </ProtectedRoute>
                } />
                <Route path="/stories" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/albums" element={
                  <ProtectedRoute>
                    <MediaGalleryPage />
                  </ProtectedRoute>
                } />
                <Route path="/timeline" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <UserProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                <Route path="/import-family-data" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ImportFamilyDataPage />
                  </ProtectedRoute>
                } />
                <Route path="/export-family-data" element={
                  <ProtectedRoute allowedRoles={['admin', 'editor']}>
                    <ExportFamilyDataPage />
                  </ProtectedRoute>
                } />
                <Route path="/legacy-stories" element={
                  <ProtectedRoute>
                    <LegacyStoriesPage />
                  </ProtectedRoute>
                } />
                <Route path="/story/:id" element={
                  <ProtectedRoute>
                    <StoryDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="/family-groups" element={
                  <ProtectedRoute>
                    <FamilyGroupsPage />
                  </ProtectedRoute>
                } />
                
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TabVisibilityProvider>
        </FamilyTreeProvider>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
