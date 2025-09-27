import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useGoogleRoleUpdate() {
  const { data: session, update } = useSession();

  useEffect(() => {
    const updatePendingRole = async () => {
      const pendingRole = sessionStorage.getItem('pendingRole');
      
      if (pendingRole && session?.user?.id && session?.user?.provider === 'google') {
        // Only update if the current role is different
        if (pendingRole !== session.user.role) {
          try {
            console.log(`Updating Google user role from ${session.user.role} to ${pendingRole}`);
            
            const response = await fetch('/api/auth/update-role', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ role: pendingRole }),
            });

            if (response.ok) {
              console.log('Role updated successfully');
              // Update the session to reflect the new role
              await update({
                user: {
                  ...session.user,
                  role: pendingRole
                }
              });
              // Clear the pending role
              sessionStorage.removeItem('pendingRole');
            } else {
              console.error('Failed to update role');
            }
          } catch (error) {
            console.error('Error updating role:', error);
          }
        } else {
          // Clear pending role if it matches current role
          sessionStorage.removeItem('pendingRole');
        }
      }
    };

    updatePendingRole();
  }, [session, update]);
}
