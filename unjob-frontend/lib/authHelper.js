// lib/authHelper.js
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Make sure this path is correct
import User from "@/models/User";

/**
 * Gets the current session and resolves the freelancer user object.
 * Returns { freelancer: userObject } on success, or { error: response } on failure.
 */
export async function getAuthenticatedFreelancer() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.userId || session.user.id || session.user._id;
  let freelancer = userId ? await User.findById(userId) : null;

  if (!freelancer && session.user.email) {
    freelancer = await User.findOne({ email: session.user.email });
  }

  if (!freelancer) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  if (freelancer.role !== "freelancer") {
    return {
      error: NextResponse.json(
        { error: "Access denied. User is not a freelancer." },
        { status: 403 }
      ),
    };
  }

  return { freelancer };
}
