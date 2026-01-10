import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { checkRateLimit, RateLimits } from "@/utils/rateLimiter";
import { sanitizeErrorMessage } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      // Get the redirect path from location state, or default to home
      const from = (location.state as { from?: string })?.from || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-heritage-purple-light to-heritage-light">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-heritage-purple mb-4" />
          <p className="text-heritage-dark font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    // Check rate limit before attempting sign in
    const rateLimitResult = checkRateLimit(`auth:signin:${email}`, 'AUTH');
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      toast({
        title: "Too many attempts",
        description: `Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      logger.log('User signed in successfully:', email);
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
      
      navigate("/");
    } catch (error: unknown) {
      logger.error('Sign in failed:', error);
      const errorMessage = sanitizeErrorMessage(error);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Enhanced password validation
    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      toast({
        title: "Error",
        description: "Password must contain at least one uppercase letter.",
        variant: "destructive",
      });
      return;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      toast({
        title: "Error",
        description: "Password must contain at least one lowercase letter.",
        variant: "destructive",
      });
      return;
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      toast({
        title: "Error",
        description: "Password must contain at least one number.",
        variant: "destructive",
      });
      return;
    }
    
    // Check rate limit before attempting sign up
    const rateLimitResult = checkRateLimit(`auth:signup:${email}`, 'AUTH');
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      toast({
        title: "Too many attempts",
        description: `Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before trying again.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await signUp(email, password);
      
      if (error) throw error;
      
      logger.log('User account created:', email);
      toast({
        title: "Account created!",
        description: "Please check your email to confirm your account.",
      });
    } catch (error: unknown) {
      logger.error('Sign up failed:', error);
      const errorMessage = sanitizeErrorMessage(error);
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-heritage-purple-light to-heritage-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-heritage-purple">Kinship Atlas</h1>
          <p className="text-heritage-dark mt-2">Connect with your family's past, present and future</p>
        </div>
        
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input 
                      type="password" 
                      placeholder="Password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Join Kinship Atlas to start building your family tree</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input 
                      type="password" 
                      placeholder="Password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters with uppercase, lowercase, and number.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full bg-heritage-purple hover:bg-heritage-purple-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
