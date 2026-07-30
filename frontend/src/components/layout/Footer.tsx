export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-center text-slate-400 md:flex-row">
        
        {/* Logo & Copyright */}
        <div>
          <h2 className="text-2xl font-bold text-blue-500">
            Syncademic
          </h2>

          <p className="mt-2 text-sm">
            © 2026 Syncademic. All rights reserved.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex gap-6 text-sm">
          <a href="#" className="hover:text-blue-400 transition">
            Home
          </a>

          <a href="#features" className="hover:text-blue-400 transition">
            Features
          </a>

          <a href="#about" className="hover:text-blue-400 transition">
            About
          </a>

          <a href="#contact" className="hover:text-blue-400 transition">
            Contact
          </a>
        </div>

        {/* Tech Stack */}
        <div className="text-sm">
          Built with ❤️ using React + FastAPI
        </div>
      </div>
    </footer>
  );
}