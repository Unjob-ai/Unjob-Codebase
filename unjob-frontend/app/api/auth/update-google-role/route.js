import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie');
    let selectedRole = null;
    
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      selectedRole = cookies.selectedRole;
    }

    console.log('=== GOOGLE ROLE UPDATE ===');
    console.log('Session user:', session.user);
    console.log('Session user ID:', session.user.id);
    console.log('Session user provider:', session.user.provider);
    console.log('Selected role from cookie:', selectedRole);
    console.log('All cookies:', cookieHeader);
    console.log('===========================');

    // Only update if we have a valid role and user doesn't have a role set
    if (selectedRole && ["freelancer", "hiring"].includes(selectedRole)) {
      await connectDB();

      // Check current user role
      const user = await User.findById(session.user.id);
      
      if (user && (!user.role || user.role === null || user.role === "freelancer")) {
        // Update the user's role if they don't have one or if they have the default freelancer role
        const updatedUser = await User.findByIdAndUpdate(
          session.user.id,
          { role: selectedRole },
          { new: true }
        );

        console.log(`Updated Google user ${session.user.id} role from ${user.role} to: ${selectedRole}`);

        // Clear the cookie by setting it with an expired date
        const response = NextResponse.json(
          { 
            message: "Role updated successfully",
            role: updatedUser.role,
            updated: true
          },
          { status: 200 }
        );
        
        response.cookies.set('selectedRole', '', {
          expires: new Date(0),
          path: '/'
        });

        return response;
      } else {
        console.log(`User already has role: ${user?.role}`);
        return NextResponse.json(
          { 
            message: "User already has a role",
            role: user?.role,
            updated: false
          },
          { status: 200 }
        );
      }
    } else {
      console.log('No valid role found in cookie');
      return NextResponse.json(
        { 
          message: "No role update needed",
          updated: false
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error("Error updating Google user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
