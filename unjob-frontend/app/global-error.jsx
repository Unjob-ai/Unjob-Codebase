"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en" className="dark">
      <head>
        <style>{`
          .sen-font {
            font-family: "Sen", system-ui, -apple-system, sans-serif;
          }
          .figtree-font {
            font-family: "Figtree", system-ui, -apple-system, sans-serif;
          }
          body {
            margin: 0;
            padding: 0;
          }
        `}</style>
      </head>
      <body className="bg-black text-white min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Critical Error Visual */}
          <div className="mb-8">
           
            
            <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mb-4 sen-font">
              Critical Error
            </div>
            <div className="text-2xl md:text-3xl font-semibold text-white mb-2 sen-font">
              Application Error
            </div>
            <div className="text-lg text-gray-300 mb-8 figtree-font">
              A critical error has occurred. Please try refreshing the page or contact support if the problem persists.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
            <button 
              onClick={reset}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors bg-green-600 hover:bg-green-700 text-black border-0 h-10 px-6 figtree-font"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Application
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors bg-transparent border border-gray-600 text-gray-300 hover:text-green-400 hover:bg-gray-800 hover:border-gray-500 h-10 px-6 figtree-font"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Homepage
            </button>
          </div>

          {/* Emergency Contact */}
          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm mb-4 figtree-font">
              If you continue to experience issues, please contact our technical support team.
            </p>
            <div className="text-sm text-gray-500 figtree-font">
              Error ID: {Date.now().toString(36).toUpperCase()}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}