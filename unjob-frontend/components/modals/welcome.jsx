import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play } from 'lucide-react';

const WelcomePopup = ({ isOpen, onClose }) => {
  const [videoLoading, setVideoLoading] = useState(true);

  const handleVideoLoad = () => {
    setVideoLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black border border-white/20 max-w-4xl w-[95vw] max-h-[90vh] rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Welcome to the Future of Work!
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Video Section */}
        <div className="px-6 pb-6">
          <div className="relative w-full h-0 pb-[56.25%] bg-gray-900 rounded-xl overflow-hidden">
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400">Loading video...</p>
                </div>
              </div>
            )}
            
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-xl"
              src="https://www.youtube.com/embed/CFMqmbB0VUk?si=zrhIrtYOaZAyhb34&autoplay=1&rel=0&modestbranding=1"
              title="Welcome Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={handleVideoLoad}
              style={{ display: videoLoading ? 'none' : 'block' }}
            ></iframe>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomePopup;