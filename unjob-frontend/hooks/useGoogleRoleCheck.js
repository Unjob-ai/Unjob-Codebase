import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function useGoogleRoleCheck() {
  const { data: session, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkAndUpdateGoogleRole = async () => {
      // Only run for Google users who might need role update
      console.log('=== GOOGLE ROLE CHECK HOOK ===');
      console.log('Session:', session);
      console.log('Session user:', session?.user);
      console.log('User provider:', session?.user?.provider);
      console.log('User role:', session?.user?.role);
      console.log('===============================');
      
      if (session?.user?.provider === 'google') {
        
        console.log('Checking Google role for user:', session.user);
        
        try {
          const response = await fetch('/api/auth/update-google-role', {
            method: 'POST',
            credentials: 'include', // Include cookies
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Google role check result:', data);
            
            if (data.updated) {
              console.log('Role was updated, refreshing session...');
              // Force session refresh
              await update();
              // Small delay to ensure session is updated
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }
          }
        } catch (error) {
          console.error('Error checking Google role:', error);
        }
      }
    };

    // Only run once when session is available
    if (session) {
      checkAndUpdateGoogleRole();
    }
  }, [session?.user?.id]); // Only run when user ID changes
}
