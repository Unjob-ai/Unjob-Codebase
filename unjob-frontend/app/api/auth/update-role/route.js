import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request) {
  try {
    console.log('=== UPDATE ROLE API DEBUG ===');
    
    // Get the current session
    const session = await getServerSession(authOptions);
    console.log('Session in API:', session);
    
    if (!session || !session.user) {
      console.log('No session found');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { role } = await request.json();
    console.log('Requested role:', role);

    // Validate role
    if (!role || !["freelancer", "hiring"].includes(role)) {
      console.log('Invalid role provided:', role);
      return NextResponse.json(
        { error: "Invalid role. Must be 'freelancer' or 'hiring'" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log('Database connected');

    // Update the user's role
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { 
        role: role,
        'profile.needsRoleSelection': false // Clear the flag
      },
      { new: true }
    );

    console.log('Updated user:', updatedUser);

    if (!updatedUser) {
      console.log('User not found in database');
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log(`Successfully updated user ${session.user.id} role to: ${role}`);

    return NextResponse.json(
      { 
        message: "Role updated successfully",
        role: updatedUser.role
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
