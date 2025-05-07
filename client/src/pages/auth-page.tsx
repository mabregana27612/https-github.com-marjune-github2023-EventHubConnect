import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { loginMutation, registerMutation, user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [tempResetLink, setTempResetLink] = useState<string | null>(null);
  
  // Get URL parameters for reset token
  const searchParams = new URLSearchParams(window.location.search);
  const resetToken = searchParams.get('token');
  
  useEffect(() => {
    // If there's a reset token, automatically switch to reset password tab
    if (resetToken) {
      setActiveTab('reset-password');
    }
  }, [resetToken]);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
    },
  });
  
  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotPasswordSchema>) => {
      const response = await apiRequest('POST', '/api/forgot-password', data);
      return await response.json();
    },
    onSuccess: (data) => {
      setForgotPasswordSuccess(true);
      
      // Check if we have a direct reset link (for testing)
      if (data.resetLink) {
        setTempResetLink(data.resetLink);
        toast({
          title: "Testing mode",
          description: "A reset link has been generated for testing. Click the link below to reset your password.",
        });
      } else {
        toast({
          title: "Reset link sent",
          description: "If your email is registered, you will receive a password reset link",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link",
        variant: "destructive",
      });
    },
  });
  
  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof resetPasswordSchema>) => {
      const response = await apiRequest('POST', '/api/reset-password', {
        token: resetToken,
        password: data.password,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      // Redirect to login page after successful reset
      setActiveTab('login');
      // Clear the token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({
      ...data,
      role: "user",
    });
  };

  const onForgotPasswordSubmit = (data: z.infer<typeof forgotPasswordSchema>) => {
    forgotPasswordMutation.mutate(data);
  };
  
  const onResetPasswordSubmit = (data: z.infer<typeof resetPasswordSchema>) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary-600">EventPro</h2>
            <p className="text-gray-600 mt-2">Your complete event management solution</p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${resetToken ? 'hidden' : activeTab === 'forgot-password' ? 'grid-cols-2' : 'grid-cols-2'} mb-8`}>
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username or Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username or email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end mb-2">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-sm" 
                          type="button"
                          onClick={() => setActiveTab("forgot-password")}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <GoogleSignInButton fullWidth variant="outline" />
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-center w-full">
                    Don't have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => setActiveTab("register")}
                    >
                      Sign up
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Fill in your details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Register"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-2 text-sm text-gray-500">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <GoogleSignInButton 
                    fullWidth 
                    variant="outline" 
                    text="Sign up with Google"
                  />
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-center w-full">
                    Already have an account?{" "}
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Forgot Password Tab */}
            <TabsContent value="forgot-password">
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("login")}
                      className="mr-2 p-0 h-8 w-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <CardTitle>Forgot Password</CardTitle>
                      <CardDescription>
                        Enter your email to reset your password
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {forgotPasswordSuccess ? (
                    <Alert className="bg-green-50 border-green-200 mb-4">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">
                        {tempResetLink ? "Reset Link Generated (Testing Mode)" : "Email sent"}
                      </AlertTitle>
                      <AlertDescription className="text-green-700">
                        {tempResetLink ? (
                          <div className="space-y-2">
                            <p>A reset link has been generated for testing. Click the button below to reset your password:</p>
                            <Button 
                              className="mt-2" 
                              variant="outline" 
                              onClick={() => {
                                setActiveTab('reset-password');
                                window.history.pushState({}, document.title, tempResetLink);
                                // Trigger the token effect
                                window.location.search = new URL(window.location.href).search;
                              }}
                            >
                              Go to Reset Password Page
                            </Button>
                            
                            {forgotPasswordMutation.data?.emailError && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                                <p className="font-semibold">Note about email sending:</p>
                                <p>{forgotPasswordMutation.data.emailError}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          "If your email address is associated with an account, you will receive password reset instructions."
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...forgotPasswordForm}>
                      <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={forgotPasswordForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter your email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={forgotPasswordMutation.isPending}
                        >
                          {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="text-sm text-center w-full">
                    Remember your password?{" "}
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => setActiveTab("login")}
                    >
                      Back to login
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Reset Password Tab */}
            <TabsContent value="reset-password">
              <Card>
                <CardHeader>
                  <CardTitle>Reset Your Password</CardTitle>
                  <CardDescription>
                    Enter a new password for your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!resetToken ? (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Invalid or Expired Token</AlertTitle>
                      <AlertDescription>
                        This password reset link is invalid or has expired. Please request a new one.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Form {...resetPasswordForm}>
                      <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                        <FormField
                          control={resetPasswordForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Enter your new password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={resetPasswordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm your new password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={resetPasswordMutation.isPending}
                        >
                          {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
                {!resetToken && (
                  <CardFooter className="flex flex-col space-y-2">
                    <div className="text-sm text-center w-full">
                      <Button
                        variant="link"
                        className="p-0"
                        onClick={() => setActiveTab("forgot-password")}
                      >
                        Request a new reset link
                      </Button>
                    </div>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 text-white p-8">
        <div className="h-full flex flex-col justify-center max-w-lg mx-auto">
          <h1 className="text-4xl font-bold mb-6">
            Streamline your events with EventPro
          </h1>
          <p className="text-xl mb-8">
            The complete platform for managing events, speakers, and attendees with powerful tools for certificates and analytics.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Event Management</h3>
                <p className="text-white/80">Create and manage events with ease</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Speaker Management</h3>
                <p className="text-white/80">Organize and schedule your speakers</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-white/20 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Certificates</h3>
                <p className="text-white/80">Generate and issue attendance certificates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
