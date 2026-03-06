export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-900">
          מחירון
        </h1>
        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
}
