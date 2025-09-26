import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

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
          await connectDB();
          console.log("Login attempt for:", credentials.email);

          const user = await User.findOne({
            email: credentials.email.toLowerCase().trim(),
          }).select("+password");

          if (!user) {
            console.log("User not found");
            throw new Error("Invalid credentials");
          }

          if (!user.password) {
            console.log("No password set (OAuth user)");
            throw new Error("Please sign in with Google");
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!isValid) {
            console.log("Invalid password");
            throw new Error("Invalid credentials");
          }

          // Check role only if both credentials.role and user.role exist and are not null
          if (credentials.role && user.role && user.role !== credentials.role) {
            console.log(`Role mismatch: ${user.role} != ${credentials.role}`);
            console.log("User is registered as:", user.role);
            console.log("Trying to login as:", credentials.role);
            throw new Error(`This account is registered as a ${user.role}. Please select the correct role.`);
          }

          await User.findByIdAndUpdate(user._id, {
            lastLoginAt: new Date(),
          });

          console.log("Login successful for:", user.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image,
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
          await connectDB();

          // We'll store Google's subject ID as a separate field for lookup
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            // Use findOneAndUpdate with upsert instead of create to bypass validation
            const newUser = await User.findOneAndUpdate(
              { email: user.email },
              {
                email: user.email,
                name: user.name,
                image: user.image,
                role: "freelancer", // Default role, will be updated by cookie check
                provider: "google",
                googleId: profile.sub, // Store Google's subject ID
              verified: true,
              profile: {
                isCompleted: false
              }
            },
            { upsert: true, new: true, runValidators: false }
            );
            console.log("New Google user created:", newUser.email);
            // Assign the MongoDB _id back to the user object for the JWT callback
            user.id = newUser._id.toString();
          } else {
            // If user exists but doesn't have googleId, add it
            if (!existingUser.googleId && profile.sub) {
              await User.findByIdAndUpdate(existingUser._id, {
                googleId: profile.sub
              });
            }
            // Assign the MongoDB _id to the user object for the JWT callback
            user.id = existingUser._id.toString();
          }
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger }) {
      try {
        // Ensure database connection
        await connectDB();
        
        if (user) {
          console.log("=== JWT CALLBACK DEBUG ===");
          console.log("Account provider:", account?.provider);
          console.log("User object:", user);
          console.log("User role:", user.role);
          console.log("==========================");
          
          // Store provider information for role selection
          if (account?.provider) {
            token.provider = account.provider;
          }
          
          // For credentials provider, the user object comes with all needed fields
          token.role = user.role;
          token.userId = user.id;
          
          // For Google login, we need to find the user by their email
          if (account?.provider === "google") {
            // First try to find user by their MongoDB ID if present
            let dbUser = null;
            
            try {
              // Try to find by MongoDB ID first if we have it
              if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
                dbUser = await User.findById(user.id);
                console.log(`[JWT-Google] Looking up user by ID ${user.id}: ${dbUser ? 'Found' : 'Not found'}`);
              }
              
              // If not found, try to find by email (this should be reliable)
              if (!dbUser && user.email) {
                dbUser = await User.findOne({ email: user.email });
                console.log(`[JWT-Google] Looking up user by email ${user.email}: ${dbUser ? 'Found' : 'Not found'}`);
              }
              
              // If found, use it
              if (dbUser) {
                token.role = dbUser.role;
                token.userId = dbUser._id.toString();
                token.email = dbUser.email;
                
                // Use the model's isProfileComplete method to determine if the profile is complete
                try {
                  // Check directly if profile.isCompleted is true first
                  if (dbUser.profile && dbUser.profile.isCompleted === true) {
                    token.isCompleted = true;
                    console.log(`[JWT-Google] User ${dbUser._id} has explicit isCompleted=true in profile`);
                  } else {
                    // Otherwise use the method to calculate completion
                    token.isCompleted = dbUser.isProfileComplete();
                    console.log(`[JWT-Google] User ${dbUser._id} profile completion calculated as: ${token.isCompleted}`);
                    
                    // Log the profile data for debugging
                    console.log(`[JWT-Google] Profile data for ${dbUser._id}:`, {
                      hasProfile: !!dbUser.profile,
                      profileFields: dbUser.profile ? Object.keys(dbUser.profile) : [],
                      isCompletedField: dbUser.profile?.isCompleted,
                      role: dbUser.role
                    });
                  }
                } catch (error) {
                  console.error("Error checking profile completion:", error);
                  // Fall back to the stored value
                  token.isCompleted = dbUser.profile?.isCompleted || false;
                  console.log(`[JWT-Google] Using fallback isCompleted=${token.isCompleted} for user ${dbUser._id}`);
                }
              } else {
                console.error("User not found in database:", user.email);
              }
            } catch (findError) {
              console.error("Error finding user:", findError);
            }
          } 
          // For credentials auth, user ID should already be valid
          else if (account?.provider === "credentials") {
            try {
              const dbUser = await User.findById(user.id);
              if (dbUser) {
                token.role = dbUser.role;
                token.userId = dbUser._id.toString();
                
                // Use the model's isProfileComplete method to determine if the profile is complete
                try {
                  // Check directly if profile.isCompleted is true first
                  if (dbUser.profile && dbUser.profile.isCompleted === true) {
                    token.isCompleted = true;
                    console.log(`[JWT-Credentials] User ${dbUser._id} has explicit isCompleted=true in profile`);
                  } else {
                    // Otherwise use the method to calculate completion
                    token.isCompleted = dbUser.isProfileComplete();
                    console.log(`[JWT-Credentials] User ${dbUser._id} profile completion calculated as: ${token.isCompleted}`);
                  }
                } catch (error) {
                  console.error("Error checking profile completion:", error);
                  // Fall back to the stored value
                  token.isCompleted = dbUser.profile?.isCompleted || false;
                  console.log(`[JWT-Credentials] Using fallback isCompleted=${token.isCompleted} for user ${dbUser._id}`);
                }
              }
            } catch (findError) {
              console.error("Error finding credentials user:", findError);
            }
          }
        }
        
        // Handle session update
        if (trigger === "update" && token.userId) {
          console.log(`[JWT] Session update triggered for user ${token.userId}`);
          console.log(`[JWT] Current token role: ${token.role}`);
          try {
            // Ensure ID is valid before querying
            if (mongoose.Types.ObjectId.isValid(token.userId)) {
              const dbUser = await User.findById(token.userId);
              if (dbUser) {
                console.log(`[JWT] Found user in DB with role: ${dbUser.role}`);
                token.role = dbUser.role;
                console.log(`[JWT] Updated token role to: ${token.role}`);
                
                // Use the model's isProfileComplete method to determine if the profile is complete
                try {
                  // Check directly if profile.isCompleted is true first
                  if (dbUser.profile && dbUser.profile.isCompleted === true) {
                    token.isCompleted = true;
                    console.log(`[JWT-Update] User ${dbUser._id} has explicit isCompleted=true in profile`);
                  } else {
                    // Otherwise use the method to calculate completion
                    token.isCompleted = dbUser.isProfileComplete();
                    console.log(`[JWT-Update] User ${dbUser._id} profile completion calculated as: ${token.isCompleted}`);
                    
                    // Log debug info about the profile
                    console.log(`[JWT-Update] Profile data for ${dbUser._id}:`, {
                      hasProfile: !!dbUser.profile,
                      profileFields: dbUser.profile ? Object.keys(dbUser.profile) : [],
                      isCompletedField: dbUser.profile?.isCompleted,
                      role: dbUser.role
                    });
                  }
                } catch (error) {
                  console.error("Error checking profile completion:", error);
                  // Fall back to the stored value
                  token.isCompleted = dbUser.profile?.isCompleted || false;
                  console.log(`[JWT-Update] Using fallback isCompleted=${token.isCompleted} for user ${dbUser._id}`);
                }
              } else {
                console.log(`[JWT-Update] User ${token.userId} not found in database during session update`);
              }
            } else {
              console.log(`[JWT-Update] Invalid user ID: ${token.userId}`);
            }
          } catch (error) {
            console.error("Error updating session:", error);
          }
        }
        
        if (account?.access_token) {
          token.accessToken = account.access_token;
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
        // Make sure we always have consistent user identifiers
        session.user.id = token.userId || null;
        session.user.userId = token.userId || null;
        
        // Role and completion status
        session.user.role = token.role || "freelancer"; // Default to freelancer
        
        // Provider information for role selection hook
        session.user.provider = token.provider || null;
        
        // Force check the DB for profile completion status if we have a userId
        if (token.userId) {
          try {
            await connectDB();
            const freshUser = await User.findById(token.userId);
            if (freshUser && freshUser.profile && freshUser.profile.isCompleted === true) {
              session.user.isCompleted = true;
              console.log(`[Session] User ${session.user.id} isCompleted=true from direct DB check`);
            } else {
              // Fall back to token value
              session.user.isCompleted = !!token.isCompleted; // Convert to boolean
            }
          } catch (error) {
            console.error("[Session] Error checking profile completion from DB:", error);
            session.user.isCompleted = !!token.isCompleted; // Fall back to token
          }
        } else {
          session.user.isCompleted = !!token.isCompleted;
        }
        
        // Pass through access token if available
        if (token.accessToken) {
          session.accessToken = token.accessToken;
        }
        
        // Always log session information
        console.log(`[Session] User ${session.user.id} session updated:`, {
          email: session.user.email,
          role: session.user.role,
          isCompleted: session.user.isCompleted,
          tokenIsCompleted: token.isCompleted
        });
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
