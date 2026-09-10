import { VehicleForm } from "./vehicle-form";

export default function NovoVeiculoPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Cadastrar veículo</h1>
        <p className="text-sm text-muted-foreground">
          Etapa 2 do fluxo de compra — depois de cadastrar, consulte a aptidão RENAVE.
        </p>
      </div>
      <VehicleForm />
    </div>
  );
}
