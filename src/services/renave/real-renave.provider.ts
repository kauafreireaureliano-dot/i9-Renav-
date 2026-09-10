import type { RenaveProvider } from "@/domain/renave";

// Placeholder para a integração real com o RENAVE. Propositalmente NÃO
// implementado: não temos ainda os endpoints oficiais, o formato exato de
// payload/resposta nem o certificado configurado neste ambiente.
//
// Quando as credenciais/documentação chegarem (RENAVE_BASE_URL,
// RENAVE_CLIENT_ID, RENAVE_CLIENT_SECRET, RENAVE_CERTIFICATE_PATH em .env),
// implemente cada método aqui seguindo exatamente a interface RenaveProvider
// — o resto do sistema (RenaveService, telas, eventos) não muda.
function notImplemented(method: string): never {
  throw new Error(
    `RealRenaveProvider.${method}: integração real com o RENAVE ainda não foi configurada. ` +
      `Defina RENAVE_ENVIRONMENT=PRODUCAO somente após implementar este provider.`
  );
}

export const realRenaveProvider: RenaveProvider = {
  consultarAptidao: () => notImplemented("consultarAptidao"),
  solicitarEntradaEstoque: () => notImplemented("solicitarEntradaEstoque"),
  enviarAtpvAssinatura: () => notImplemented("enviarAtpvAssinatura"),
  consultarAtpv: () => notImplemented("consultarAtpv"),
  enviarNotaFiscalEntrada: () => notImplemented("enviarNotaFiscalEntrada"),
  consultarEstoque: () => notImplemented("consultarEstoque"),
  solicitarSaidaEstoque: () => notImplemented("solicitarSaidaEstoque"),
  consultarSaidaEstoque: () => notImplemented("consultarSaidaEstoque"),
  enviarNotaFiscalSaida: () => notImplemented("enviarNotaFiscalSaida"),
  cancelarEntrada: () => notImplemented("cancelarEntrada"),
  cancelarSaida: () => notImplemented("cancelarSaida"),
};
