import type { FiscalProvider } from "@/domain/fiscal";

// Placeholder para a integração fiscal real (SEFAZ ou provedor terceirizado).
// Não implementado propositalmente: ainda não definimos o provedor/estrutura
// fiscal nem os requisitos da empresa (seção 9 do escopo). Implemente aqui
// quando isso estiver decidido — a interface FiscalProvider não deve mudar.
function notImplemented(method: string): never {
  throw new Error(
    `RealFiscalProvider.${method}: integração fiscal real ainda não foi configurada. ` +
      `Defina FISCAL_ENVIRONMENT=PRODUCAO somente após implementar este provider.`
  );
}

export const realFiscalProvider: FiscalProvider = {
  emitirNotaEntrada: () => notImplemented("emitirNotaEntrada"),
  emitirNotaSaida: () => notImplemented("emitirNotaSaida"),
  consultarNota: () => notImplemented("consultarNota"),
  cancelarNota: () => notImplemented("cancelarNota"),
  baixarXML: () => notImplemented("baixarXML"),
  consultarStatus: () => notImplemented("consultarStatus"),
};
