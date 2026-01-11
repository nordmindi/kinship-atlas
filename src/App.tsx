import { Suspense, lazy } from "react";
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
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AddFamilyMemberPage = lazy(() => import("./pages/AddFamilyMemberPage"));
const EditFamilyMemberPage = lazy(() => import("./pages/EditFamilyMemberPage"));
const AddStoryPage = lazy(() => import("./pages/AddStoryPage"));
const FamilyMemberDetailPage = lazy(() => import("./pages/FamilyMemberDetailPage"));
const FamilyTreeViewPage = lazy(() => import("./pages/FamilyTreeViewPage"));
const FamilyMapPage = lazy(() => import("./pages/FamilyMapPage"));
const AddRelationPage = lazy(() => import("./pages/AddRelationPage"));
const MediaGalleryPage = lazy(() => import("./pages/MediaGalleryPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ImportFamilyDataPage = lazy(() => import("./pages/ImportFamilyDataPage"));
const ExportFamilyDataPage = lazy(() => import("./pages/ExportFamilyDataPage"));
const LegacyStoriesPage = lazy(() => import("./pages/LegacyStoriesPage"));
const StoryDetailPage = lazy(() => import("./pages/StoryDetailPage"));
const FamilyGroupsPage = lazy(() => import("./pages/FamilyGroupsPage"));
const AllFamilyMembersPage = lazy(() => import("./pages/AllFamilyMembersPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <FamilyTreeProvider>
          <TabVisibilityProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
            </BrowserRouter>
          </TabVisibilityProvider>
        </FamilyTreeProvider>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
