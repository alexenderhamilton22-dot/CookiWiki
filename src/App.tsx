import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from 'react';
import Index from "./pages/Index";
const Auth = lazy(() => import('./pages/Auth'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const RecipeForm = lazy(() => import('./pages/RecipeForm'));
const RecipeArchive = lazy(() => import('./pages/RecipeArchive'));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RecipeEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  return <RecipeForm key={`${user?.id || 'anonymous'}:${id || 'new'}`} />;
}
const router = createBrowserRouter([
  { path: '/', element: <Index /> },
  { path: '/connexion', element: <Auth /> },
  { path: '/recette/nouvelle', element: <RecipeEditor /> },
  { path: '/recette/:id', element: <RecipeDetail /> },
  { path: '/recette/:id/modifier', element: <RecipeEditor /> },
  { path: '/corbeille', element: <RecipeArchive /> },
  { path: '*', element: <NotFound /> },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<p role="status" className="p-8 text-center">Chargement…</p>}><RouterProvider router={router} /></Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
