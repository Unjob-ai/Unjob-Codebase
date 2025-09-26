import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute inset-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full opacity-40 animate-spin"></div>
          <div className="absolute inset-4 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        </div>
        <div className="text-lg font-medium text-white mb-2" style={{ fontFamily: '"Sen", system-ui, -apple-system, sans-serif' }}>
          Loading...
        </div>
        <div className="text-sm text-gray-400" style={{ fontFamily: '"Figtree", system-ui, -apple-system, sans-serif' }}>
          Please wait while we prepare your content
        </div>
      </div>
    </div>
  );
}