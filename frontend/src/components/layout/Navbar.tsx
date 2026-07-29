export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        {/* Logo */}
        <h1 className="text-2xl font-bold text-blue-500">
          Syncademic
        </h1>

        {/* Navigation */}
        <div className="hidden md:flex items-center gap-8 text-slate-300">
          <a href="#" className="transition hover:text-blue-400">
            Home
          </a>

          <a href="#features" className="transition hover:text-blue-400">
            Features
          </a>

          <a href="#about" className="transition hover:text-blue-400">
            About
          </a>

          <a href="#contact" className="transition hover:text-blue-400">
            Contact
          </a>
        </div>

        {/* Login Button */}
        <button className="rounded-xl border border-blue-500 px-5 py-2 text-blue-500 transition hover:bg-blue-500 hover:text-white">
          Login
        </button>
      </div>
    </nav>
  );
}