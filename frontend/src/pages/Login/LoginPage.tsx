import api from "../../services/api";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const handleLogin = async (e: any) => {
  e.preventDefault();

  try {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    console.log("Success:", response.data);
  } catch (error) {
    console.error(error);
  }
};
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">

      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-2xl">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
            Syncademic
          </h1>

          <p className="mt-3 text-slate-400">
            Welcome back!
          </p>

          <p className="text-sm text-slate-500">
            Continue managing your academic life.
          </p>
        </div>

        {/* Form */}
       <form onSubmit={handleLogin} className="mt-8 space-y-6">

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Email Address
            </label>

            <input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
/>
          </div>

         {/* Password */}
<div>
  <label className="mb-2 block text-sm text-slate-300">
    Password
  </label>

  <div className="relative">
    <input
  type={showPassword ? "text" : "password"}
  placeholder="Enter your password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
/>

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
    >
      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>
</div>

          {/* Options */}
          <div className="flex items-center justify-between text-sm">

            <label className="flex items-center gap-2 text-slate-400">
              <input type="checkbox" />
              Remember me
            </label>

            <button
              type="button"
              className="text-blue-400 hover:text-blue-300"
            >
              Forgot Password?
            </button>

          </div>

          {/* Login Button */}
          <button
  type="submit"
  className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition-all duration-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95"
>
            Login
          </button>

        </form>

        {/* Register */}
        <p className="mt-8 text-center text-slate-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-blue-400 hover:text-blue-300"
          >
            Create Account
          </Link>
        </p>

      </div>

    </div>
  );
}