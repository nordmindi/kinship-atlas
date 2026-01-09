import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

export const AuthLoadingState = () => {
    const { isLoading, error } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-heritage-light/30">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 animate-spin text-heritage-purple mb-4" />
                    <p className="text-heritage-dark font-medium">Loading application...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-heritage-light/30">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-red-100 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
                    <p className="text-gray-600 mb-6">
                        We couldn't connect to the server. This might be due to a network issue or the server being unavailable.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg text-left text-xs font-mono text-gray-500 mb-6 overflow-auto max-h-32 border border-gray-100">
                        {error.message}
                    </div>

                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-heritage-purple hover:bg-heritage-purple-medium h-12 text-base"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry Connection
                    </Button>
                </div>
            </div>
        );
    }

    return null;
};
