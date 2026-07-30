type FeatureCardProps = {
  title: string;
  description: string;
  icon: string;
};

export default function FeatureCard({
  title,
  description,
  icon,
}: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-500">
      <div className="text-5xl">{icon}</div>

      <h2 className="mt-4 text-2xl font-bold text-white">
        {title}
      </h2>

      <p className="mt-3 text-slate-400 leading-7">
        {description}
      </p>
    </div>
  );
}