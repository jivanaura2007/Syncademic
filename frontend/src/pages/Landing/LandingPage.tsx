import Footer from "../../components/layout/Footer";
import Navbar from "../../components/layout/Navbar";
import FeatureCard from "../../components/common/FeatureCard";

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-950 text-white">
        {/* Hero Section */}
        <section className="flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-6xl font-bold text-transparent md:text-7xl">
            Syncademic
          </h1>

          <p className="mt-6 max-w-2xl text-xl text-slate-400">
            Manage attendance, organize notes, track semesters,
            and never miss an academic deadline.
          </p>

          <div className="mt-10 flex gap-5">
            <button className="rounded-xl bg-blue-600 px-7 py-3 font-semibold transition hover:bg-blue-700">
              Get Started
            </button>

            <button className="rounded-xl border border-slate-700 px-7 py-3 transition hover:bg-slate-800">
              Login
            </button>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto grid max-w-7xl gap-8 px-8 pb-20 md:grid-cols-3"
        >
          <FeatureCard
            icon="📊"
            title="Attendance Tracker"
            description="Track attendance, calculate safe bunks, and receive alerts when attendance becomes critical."
          />

          <FeatureCard
            icon="📚"
            title="Smart Notes"
            description="Upload PDFs, PPTs, images, Excel sheets and organize everything automatically by subject."
          />

          <FeatureCard
            icon="📅"
            title="Semester Planner"
            description="Import your timetable and academic calendar to automate attendance and class scheduling."
          />
        </section>

        {/* Footer */}
      </main>
      <Footer />
    </>
  );
}