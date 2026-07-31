import api from "../../services/api";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading] = useState(false);
const [success, setSuccess] = useState("");
const [error, setError] = useState("");
const handleRegister = async (e: any) => {
  e.preventDefault();

  setSuccess("");
  setError("");

  if (!fullName.trim()) {
    setError("Please enter your full name.");
    return;
  }

  if (!email.trim()) {
    setError("Please enter your email.");
    return;
  }

  if (!password.trim()) {
    setError("Please enter your password.");
    return;
  }

  if (!confirmPassword.trim()) {
    setError("Please confirm your password.");
    return;
  }

  setLoading(true);

  try {
    const response = await api.post("/auth/register", {
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
    });

    console.log(response.data);
    setSuccess("Account created successfully!");

  } catch (err: any) {
    if (err.response?.data?.detail) {
      setError(err.response.data.detail);
    } else {
      setError("Unable to connect to server.");
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">

      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-2xl">

        {/* Logo */}
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-4xl font-bold text-transparent">
            Syncademic
          </h1>

          <p className="mt-3 text-slate-400">
            Create your account
          </p>

          <p className="text-sm text-slate-500">
            Start organizing your academic life today.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="mt-8 space-y-5">

          {/* Full Name */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Full Name
            </label>

           <input
  type="text"
  placeholder="Enter your full name"
  value={fullName}
  onChange={(e) => setFullName(e.target.value)}
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
/>
          </div>

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
  placeholder="Create a password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
/>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Confirm Password
            </label>

            <div className="relative">
              <input
  type={showConfirmPassword ? "text" : "password"}
  placeholder="Confirm your password"
  value={confirmPassword}
  onChange={(e) => setConfirmPassword(e.target.value)}
  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
/>

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400"
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {success && (
  <div className="rounded-lg border border-green-500 bg-green-500/20 px-4 py-3 text-green-300">
    {success}
  </div>
)}

{error && (
  <div className="rounded-lg border border-red-500 bg-red-500/20 px-4 py-3 text-red-300">
    {error}
  </div>
)}

          {/* Register Button */}
          <button
  type="submit"
  disabled={loading}
  className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition-all duration-200 hover:scale-[1.02] hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
>
  {loading ? "Creating Account..." : "Create Account"}
</button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-400 hover:text-blue-300"
          >
            Login
          </Link>
        </p>

      </div>

    </div>
  );
}