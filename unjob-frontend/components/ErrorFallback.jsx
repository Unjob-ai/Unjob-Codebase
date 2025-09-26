"use client";

import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Home, 
  RefreshCw, 
  ArrowLeft, 
  Mail, 
  Search,
  HelpCircle,
  Server 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ErrorFallback({ 
  error, 
  reset, 
  errorType = "general",
  statusCode = null 
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Log error for monitoring
    if (error) {
      console.error("Error Fallback:", error);
    }
  }, [error]);

  // Determine error type and content based on props or error
  const getErrorContent = () => {
    if (statusCode === 404 || errorType === "notFound") {
      return {
        title: "404",
        heading: "Page Not Found",
        message: "Oops! The page you're looking for seems to have disappeared into the digital void.",
        icon: HelpCircle,
        color: "green"
      };
    }
    
    if (statusCode === 500 || errorType === "server") {
      return {
        title: "500",
        heading: "Internal Server Error",
        message: "Our servers are experiencing some issues. Our technical team has been notified and is working on a fix.",
        icon: Server,
        color: "red"
      };
    }

    // Default error
    return {
      title: "Oops!",
      heading: "Something went wrong",
      message: "We encountered an unexpected error. Don't worry, our team has been notified.",
      icon: AlertTriangle,
      color: "red"
    };
  };

  const errorContent = getErrorContent();
  const IconComponent = errorContent.icon;

  if (!mounted) {
    return null; // Prevent hydration issues
  }

  return (
    <>
      {/* Font styles matching your website */}
      <style jsx>{`
        .sen-font {
          font-family: "Sen", system-ui, -apple-system, sans-serif;
        }
        .figtree-font {
          font-family: "Figtree", system-ui, -apple-system, sans-serif;
        }
      `}</style>
      
      <div className="min-h-screen py-28 sm:py-0 bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          
          {/* Error Visual - Matching your site's style */}
          <div className="mb-8">
          
            {/* Error Title with gradient text matching your site */}
            <div 
              className={`text-7xl md:text-8xl font-bold bg-gradient-to-r ${
                errorContent.color === 'green' 
                  ? 'from-green-400 via-green-500 to-green-600' 
                  : 'from-red-400 via-red-500 to-red-600'
              } bg-clip-text text-transparent mb-4 sen-font`}
            >
              {errorContent.title}
            </div>
            
            <div className="text-2xl md:text-3xl font-semibold text-white mb-2 sen-font">
              {errorContent.heading}
            </div>
            
            <div className="text-lg text-gray-300 mb-8 figtree-font max-w-lg mx-auto">
              {errorContent.message}
            </div>
          </div>

          {/* Error Details for Development */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-8 p-4 bg-gray-900 border border-gray-700 rounded-lg text-left overflow-auto max-h-40">
              <div className="text-red-400 font-mono text-sm">
                <div className="flex items-center mb-2 figtree-font font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Debug Information:
                </div>
                <div className="text-gray-300 figtree-font">
                  {error.message || "An unexpected error occurred"}
                </div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-gray-400 cursor-pointer figtree-font">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Server Status for 500 errors */}
          {(statusCode === 500 || errorContent.color === 'red') && statusCode !== 404 && (
            <div className="mb-8 p-4 bg-gray-900 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-white text-sm figtree-font font-medium">
                  {statusCode === 500 ? "Server Status: Under Maintenance" : "System Status: Error Detected"}
                </span>
              </div>
              <p className="text-gray-400 text-sm figtree-font">
                We're working to resolve this issue as quickly as possible.
              </p>
            </div>
          )}

          {/* Action Buttons - Matching your site's button style */}
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
            
            {/* Primary Action Button */}
            {reset ? (
              <Button 
                onClick={reset}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-black border-0 figtree-font font-semibold rounded-full px-6"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            ) : (
              <Button 
                onClick={() => window.location.reload()}
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-black border-0 figtree-font font-semibold rounded-full px-6"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
            )}
            
            {/* Go Back Button */}
            <Button 
              onClick={() => router.back()}
              variant="outline" 
              className="w-full md:w-auto bg-transparent border-gray-600 text-gray-300 hover:text-green-400 hover:bg-gray-800 hover:border-gray-500 figtree-font rounded-full px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            {/* Home Button */}
            <Link href="/">
              <Button 
                variant="outline" 
                className="w-full md:w-auto bg-transparent border-green-600 text-green-400 hover:bg-green-900/20 hover:border-green-500 figtree-font rounded-full px-6"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Additional Navigation Options */}
          <div className="mt-8 flex justify-center space-x-6 text-sm">
            <Link 
              href="/dashboard" 
              className="text-gray-300 hover:text-green-400 transition-colors figtree-font flex items-center"
            >
              <Search className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
            <Link 
              href="/contact-us" 
              className="text-gray-300 hover:text-green-400 transition-colors figtree-font flex items-center"
            >
              <Mail className="w-4 h-4 mr-1" />
              Contact Support
            </Link>
          </div>

          {/* Help Section for 404 errors */}
          {statusCode === 404 && (
            <div className="mt-12 pt-8 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-4 figtree-font">
                Need help? Here are some suggestions:
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-medium mb-1 figtree-font">Check the URL</div>
                  <div className="text-gray-400 figtree-font">Make sure the address is correct</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium mb-1 figtree-font">Browse Categories</div>
                  <div className="text-gray-400 figtree-font">Explore our main sections</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium mb-1 figtree-font">Contact Support</div>
                  <div className="text-gray-400 figtree-font">
                    <Link href="/contact-us" className="text-green-400 hover:text-green-300 transition-colors">
                      Get in touch
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Information */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-sm figtree-font">
              Error occurred at {new Date().toLocaleString()}
            </p>
            {statusCode && (
              <div className="text-xs text-gray-600 figtree-font mt-1">
                Error Reference: #{Date.now().toString(36).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}