'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if user already has a role
  useEffect(() => {
    if (session?.user?.role && session?.user?.role !== 'null') {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    console.log('=== ROLE SELECTION DEBUG ===');
    console.log('Selected role:', selectedRole);
    console.log('Current session:', session);
    console.log('============================');

    setLoading(true);
    
    try {
      console.log('Sending role update request...');
      const response = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      console.log('Role update response status:', response.status);
      const data = await response.json();
      console.log('Role update response data:', data);

      if (response.ok) {
        console.log('Role update successful');
        toast.success('Role selected successfully!');
        
        // Force a page reload to ensure the middleware gets the updated session
        window.location.href = '/onboarding';
      } else {
        console.error('Role update failed:', data);
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Gradient + Blur Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-green-900/30 z-0" />
      <div
        className="absolute top-[-800px] left-1/2 transform -translate-x-1/2 w-[1500px] h-[1500px] bg-no-repeat bg-top bg-contain pointer-events-none z-0"
        style={{
          backgroundImage:
            "url('/4fead141e6838d415e5b083de8afdbddb8332763.png')",
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 backdrop-blur-xl bg-white/5 px-8 py-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Unjob!</h1>
            <p className="text-gray-400 text-sm">
              Please select your role to continue
            </p>
          </div>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRole === 'freelancer'
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setSelectedRole('freelancer')}
            >
              <h3 className="font-semibold text-white">Freelancer</h3>
              <p className="text-sm text-gray-400 mt-1">
                I want to find work and offer my services
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedRole === 'hiring'
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
              onClick={() => setSelectedRole('hiring')}
            >
              <h3 className="font-semibold text-white">Hiring Manager</h3>
              <p className="text-sm text-gray-400 mt-1">
                I want to hire freelancers for my projects
              </p>
            </div>
          </div>

          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading}
            className="w-full mt-6 bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:from-green-500 hover:via-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300"
          >
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
