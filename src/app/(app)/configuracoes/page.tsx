import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "./settings-form";

export default async function ConfiguracoesPage() {
  const [settings, user] = await Promise.all([
    prisma.companySettings.findFirst(),
    getCurrentUser(),
  ]);

  const renaveEnv = process.env.RENAVE_ENVIRONMENT === "PRODUCAO" ? "PRODUÇÃO" : "AMBIENTE DE TESTE";
  const fiscalEnv = process.env.FISCAL_ENVIRONMENT === "PRODUCAO" ? "PRODUÇÃO" : "AMBIENTE DE TESTE";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados da empresa e status das integrações</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">RENAVE:</span>
            <Badge variant={renaveEnv === "PRODUÇÃO" ? "default" : "outline"}>{renaveEnv}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Fiscal:</span>
            <Badge variant={fiscalEnv === "PRODUÇÃO" ? "default" : "outline"}>{fiscalEnv}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} readOnly={user?.role !== "ADMIN"} />
        </CardContent>
      </Card>
    </div>
  );
}
