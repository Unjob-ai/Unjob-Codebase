import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Helper to call backend API
async function callBackend(path, options = {}) {
  const base = process.env.BACKEND_URL || "http://localhost:3001";
  const url = `${base}${path}`;
  const res = await fetch(url, {
    // Always include JSON headers unless explicitly overridden
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = { message: "Invalid JSON from backend" };
  }
  return { ok: res.ok, status: res.status, data };
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
        role: { type: "hidden" },
      },
      async authorize(credentials) {
        try {
          const payload = {
            email: credentials.email?.toLowerCase().trim(),
            password: credentials.password,
          };

          const { ok, data, status } = await callBackend("/api/auth/login", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          if (!ok) {
            const msg = data?.message || data?.error || "Login failed";
            throw new Error(msg);
          }

          const backendUser = data?.data?.user || data?.user || {};
          const accessToken = data?.data?.token || data?.token;

          // Optional: enforce role matching if provided by UI
          if (
            credentials.role &&
            backendUser.role &&
            backendUser.role !== credentials.role
          ) {
            throw new Error(
              `This account is registered as a ${backendUser.role}. Please select the correct role.`
            );
          }

          return {
            id: backendUser._id?.toString?.() || backendUser.id || backendUser._id,
            email: backendUser.email,
            name: backendUser.name,
            role: backendUser.role,
            image: backendUser.image,
            backendAccessToken: accessToken,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          throw new Error(error.message || "Login failed");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google") {
          // Delegate Google auth user creation/upsert to backend
          const body = {
            name: user?.name,
            email: user?.email,
            googleId: profile?.sub,
            image: user?.image,
            role: "freelancer", // default; UI can update later
          };
          const { ok, data } = await callBackend("/api/auth/google", {
            method: "POST",
            body: JSON.stringify(body),
          });
          if (!ok) return false;
          const backendUser = data?.data?.user || {};
          const accessToken = data?.data?.token;
          // Mutate user object so jwt() can pick these up
          user.id = backendUser._id?.toString?.() || backendUser.id || backendUser._id;
          user.role = backendUser.role;
          user.backendAccessToken = accessToken;
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger }) {
      try {
        if (user) {
          // Store provider for client-side logic if needed
          if (account?.provider) token.provider = account.provider;

          token.role = user.role;
          token.userId = user.id;

          // Access token from backend if available (credentials or google)
          if (user.backendAccessToken) {
            token.accessToken = user.backendAccessToken;
          }
        }

        // On initial login or when explicitly triggered, refresh profile completion from backend
        if ((user || trigger === "update") && token.accessToken) {
          try {
            const { ok, data } = await callBackend("/api/auth/me", {
              method: "GET",
              headers: { Authorization: `Bearer ${token.accessToken}` },
            });
            if (ok) {
              const isComplete = data?.data?.isProfileComplete;
              const backendUser = data?.data?.user;
              if (typeof isComplete === "boolean") token.isCompleted = isComplete;
              // Keep role in sync if backend sends it
              if (backendUser?.role) token.role = backendUser.role;
              if (backendUser?._id && !token.userId) token.userId = backendUser._id;
            }
          } catch (e) {
            // Silent fail; keep previous token state
          }
        }

        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        // Return the token as is if there's an error
        return token;
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId || null;
        session.user.userId = token.userId || null;
        session.user.role = token.role || "freelancer";
        session.user.provider = token.provider || null;
        session.user.isCompleted = !!token.isCompleted;
        if (token.accessToken) session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login?error=auth",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
