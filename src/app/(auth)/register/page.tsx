import { listGroupsForRegistration } from "@/services/auth";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const groups = await listGroupsForRegistration();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-5 rounded-lg border border-gray-200 bg-white p-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="mt-1 text-sm text-gray-500">
            Faqat o&apos;quvchilar shu yerdan ro&apos;yxatdan o&apos;tadi
          </p>
        </div>

        <RegisterForm groups={groups} />

        <p className="text-center text-sm text-gray-500">
          Hisobingiz bormi?{" "}
          <a href="/login" className="font-medium text-gray-900 underline">
            Kirish
          </a>
        </p>
      </div>
    </main>
  );
}
