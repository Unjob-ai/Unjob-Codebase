import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const isValid = email === "admin@gmail.com" && password === "Admin@123";

    if (!isValid) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set("admin-token", "true", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, message: "Bad request" }, { status: 400 });
  }
}


