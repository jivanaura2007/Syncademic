import Navbar from "../../components/layout/Navbar";

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-blue-500">
            Syncademic
          </h1>

          <p className="mt-5 text-xl text-slate-400">
            Your Academic Life, Organized.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700">
              Get Started
            </button>

            <button className="rounded-xl border border-slate-700 px-6 py-3 hover:bg-slate-800">
              Login
            </button>
          </div>
        </div>
      </main>
    </>
  );
}