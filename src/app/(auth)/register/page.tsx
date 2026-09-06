export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-subtle px-4 py-10">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-bg p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold text-text">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="mt-2 text-sm text-text-muted">
            O&apos;quvchi hisobini faqat o&apos;z ustozingiz yaratadi va sizni
            guruhga qo&apos;shadi. Login va parolni ustozingizdan so&apos;rang.
          </p>
        </div>

        <p className="text-sm text-text-muted">
          Hisobingiz bormi?{" "}
          <a href="/login" className="font-medium text-brand underline">
            Kirish
          </a>
        </p>
      </div>
    </main>
  );
}
