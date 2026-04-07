import jsPDF from "jspdf";

interface PnsaAuditData {
  id: string;
  visitDate: string;
  auditor: string;
  complianceScore: number;
  notes?: string | null;
  nonConformReasons?: Record<string, string> | null;
  waterQuality: string;
  birdNets: string;
  sanitaryBarrier: string;
  pestControl: string;
  compostBin: string;
  traceability: string;
  vehicleRegistry: string;
  farm: { name: string };
}

const AUDIT_LABELS: Record<string, string> = {
  waterQuality: "Limpeza e Cloração de Água",
  birdNets: "Telas Antipássaros (Malha ≤ 1\")",
  sanitaryBarrier: "Barreira Sanitária e Vestiários",
  pestControl: "Controle de Pragas e Roedores",
  compostBin: "Composteira (Destinação de Carcaças)",
  traceability: "Rastreabilidade (GTAs de Origem)",
  vehicleRegistry: "Registro de Visitas e Veículos",
};

/**
 * Gera o PDF do Boletim Sanitário PNSA com dados reais da auditoria.
 */
export function generatePnsaPdf(audit: PnsaAuditData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // === HEADER ===
  doc.setFillColor(13, 46, 26); // #0D2E1A
  doc.rect(0, 0, pageWidth, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BOLETIM SANITÁRIO — PNSA", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Programa Nacional de Sanidade Avícola · IN 56/2007 MAPA", margin, 26);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, margin, 33);

  y = 52;

  // === METADADOS ===
  doc.setTextColor(13, 46, 26);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DA AUDITORIA", margin, y);
  y += 2;

  doc.setDrawColor(26, 94, 53); // #1A5E35
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const meta = [
    ["Granja:", audit.farm?.name || "N/A"],
    ["Data da Auditoria:", new Date(audit.visitDate).toLocaleDateString("pt-BR")],
    ["Auditor / RT:", audit.auditor],
    ["Score de Conformidade:", `${audit.complianceScore}%`],
  ];

  meta.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 50, y);
    y += 6;
  });

  y += 6;

  // === CHECKLIST ===
  doc.setTextColor(13, 46, 26);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITENS DE VERIFICAÇÃO ESTRUTURAL", margin, y);
  y += 2;

  doc.setDrawColor(26, 94, 53);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Header da tabela
  doc.setFillColor(240, 243, 240);
  doc.rect(margin, y - 4, contentWidth, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 46, 26);
  doc.text("Nº", margin + 2, y);
  doc.text("ITEM DE VERIFICAÇÃO", margin + 12, y);
  doc.text("RESULTADO", margin + contentWidth - 30, y);
  y += 8;

  const items = Object.entries(AUDIT_LABELS);
  const reasons = (audit.nonConformReasons && typeof audit.nonConformReasons === 'object') 
    ? audit.nonConformReasons as Record<string, string> 
    : {};

  items.forEach(([key, label], index) => {
    const value = (audit as any)[key] as string;
    const isConforme = value === "CONFORME";
    const reason = reasons[key];

    // Checar se precisa de nova página
    const neededHeight = isConforme ? 8 : (reason ? 20 : 8);
    if (y + neededHeight > 270) {
      doc.addPage();
      y = margin;
    }

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y - 4, contentWidth, 8, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`${index + 1}.`, margin + 2, y);
    doc.text(label, margin + 12, y);

    // Status com cor
    if (isConforme) {
      doc.setTextColor(26, 94, 53); // Verde
      doc.setFont("helvetica", "bold");
      doc.text("✓ CONFORME", margin + contentWidth - 30, y);
    } else {
      doc.setTextColor(131, 60, 70); // Vermelho
      doc.setFont("helvetica", "bold");
      doc.text("✗ NÃO CONFORME", margin + contentWidth - 35, y);
    }

    y += 8;

    // Motivo da não conformidade (se existir)
    if (!isConforme && reason) {
      doc.setFillColor(254, 242, 242); // Fundo vermelho suave
      const reasonLines = doc.splitTextToSize(`Motivo: ${reason}`, contentWidth - 16);
      const reasonHeight = reasonLines.length * 4 + 6;
      doc.roundedRect(margin + 4, y - 3, contentWidth - 8, reasonHeight, 2, 2, "F");
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(131, 60, 70);
      doc.text(reasonLines, margin + 8, y + 1);
      y += reasonHeight + 2;
    }
  });

  y += 6;

  // === SCORE VISUAL ===
  const scoreColor = audit.complianceScore === 100
    ? [76, 175, 80] // Verde
    : audit.complianceScore >= 70
      ? [255, 179, 0] // Amarelo
      : [239, 83, 80]; // Vermelho

  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");

  const scoreText = audit.complianceScore === 100
    ? `SCORE: ${audit.complianceScore}% — GRANJA 100% CONFORME`
    : audit.complianceScore >= 70
      ? `SCORE: ${audit.complianceScore}% — ATENÇÃO: PENDÊNCIAS IDENTIFICADAS`
      : `SCORE: ${audit.complianceScore}% — RISCO ALTO: AÇÃO CORRETIVA URGENTE`;

  doc.text(scoreText, margin + 6, y + 11);
  y += 28;

  // === OBSERVAÇÕES ===
  if (audit.notes) {
    doc.setTextColor(13, 46, 26);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVAÇÕES / NOTA TÉCNICA", margin, y);
    y += 2;

    doc.setDrawColor(26, 94, 53);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(audit.notes, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // === FOOTER LEGAL ===
  y = Math.max(y, 240);

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text(
    "Este documento é uma auto-auditoria interna e NÃO substitui a inspeção oficial do MAPA.",
    margin,
    y
  );
  y += 4;
  doc.text(
    "A validade legal do certificado PNSA exige inspeção in-loco por médico veterinário oficial do estado.",
    margin,
    y
  );
  y += 4;
  doc.text(
    `Documento gerado automaticamente pelo sistema Avicultura® · ID: ${audit.id}`,
    margin,
    y
  );

  // === SALVAR ===
  const farmName = (audit.farm?.name || "granja").replace(/\s+/g, "_");
  const dateStr = new Date(audit.visitDate).toISOString().split("T")[0];
  doc.save(`Boletim_PNSA_${farmName}_${dateStr}.pdf`);
}
