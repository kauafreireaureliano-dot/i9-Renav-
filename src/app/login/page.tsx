import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-black text-white p-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">
            I9 <span className="text-primary">AUTO</span>
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestão completa da sua revenda.
          </h1>
          <p className="mt-4 text-neutral-400 max-w-md">
            Estoque, compras, vendas, documentação, RENAVE e notas fiscais em um
            único sistema — feito para a I9 Car Multimarcas.
          </p>
        </div>
        <p className="text-sm text-neutral-500">
          © {new Date().getFullYear()} I9 Car Multimarcas
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden text-center">
            <span className="text-2xl font-bold tracking-tight">
              I9 <span className="text-primary">AUTO</span>
            </span>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-sm text-muted-foreground">
              Use suas credenciais para acessar o sistema.
            </p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
