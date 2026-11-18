import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <h2 className="text-4xl font-extrabold text-slate-800">404</h2>
      <p className="text-base text-slate-600 mt-2 font-medium">Page Not Found</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        The pharmacy ERP route or invoice page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}

