import React, { useState, useEffect } from "react";
import { X, FileDown, AlertTriangle, Truck, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CriticalItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  category: string;
}

interface GerarPedidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  criticalItems: CriticalItem[];
  farmName: string;
}

export function GerarPedidoModal({ isOpen, onClose, criticalItems, farmName }: GerarPedidoModalProps) {
  // Estado para armazenar os inputs de cada item
  const [inputs, setInputs] = useState<Record<string, { buyQuantity: string; supplier: string }>>({});

  // Inicializar estado quando modal abre
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { buyQuantity: string; supplier: string }> = {};
      criticalItems.forEach(item => {
        // Sugere comprar até dobrar a quantidade mínima, ou no mínimo o suficiente para sair do vermelho
        const suggested = item.minQuantity > 0 ? (item.minQuantity * 2) - item.quantity : 1;
        initial[item.id] = {
          buyQuantity: Math.max(1, suggested).toString(),
          supplier: ""
        };
      });
      setInputs(initial);
    }
  }, [isOpen, criticalItems]);

  if (!isOpen) return null;

  const handleInputChange = (id: string, field: "buyQuantity" | "supplier", value: string) => {
    setInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleGeneratePDF = () => {
    // Validar se pelo menos quantidades > 0 foram informadas
    const itemsToBuy = criticalItems.filter(item => {
      const q = parseFloat(inputs[item.id]?.buyQuantity);
      return !isNaN(q) && q > 0;
    });

    if (itemsToBuy.length === 0) {
      toast.error("Preencha as quantidades para gerar o pedido.");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.setTextColor(26, 94, 53); // #1A5E35
      doc.text("Ordem de Compra de Insumos", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Propriedade: ${farmName}`, 14, 30);
      doc.text(`Data do Pedido: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 14, 36);

      // Agrupar itens por Fornecedor para organizar a tabela
      const itemsBySupplier: Record<string, CriticalItem[]> = {};
      itemsToBuy.forEach(item => {
        const sup = inputs[item.id]?.supplier?.trim() || "Fornecedor Não Definido";
        if (!itemsBySupplier[sup]) itemsBySupplier[sup] = [];
        itemsBySupplier[sup].push(item);
      });

      let startY = 45;

      Object.keys(itemsBySupplier).forEach(supplier => {
        // Título do fornecedor
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Fornecedor: ${supplier}`, 14, startY);
        
        const tableData = itemsBySupplier[supplier].map(item => [
          item.name,
          `${item.quantity} ${item.unit}`,
          `${inputs[item.id].buyQuantity} ${item.unit}`
        ]);

        autoTable(doc, {
          startY: startY + 5,
          head: [['Produto', 'Estoque Atual', 'Qtd. a Comprar']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [26, 94, 53] }
        });

        startY = (doc as any).lastAutoTable.finalY + 15;
      });

      // Salvar
      doc.save(`Pedido_Compra_${farmName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("PDF de Pedido gerado com sucesso!", { icon: <FileDown className="w-4 h-4 text-white" />, style: { backgroundColor: '#1A5E35', color: '#fff' }});
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar o PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="border-b border-outline-variant/30 px-6 py-4 flex items-center justify-between bg-[#1A5E35] text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gerar Pedido de Compra</h2>
              <p className="text-xs font-medium text-white/80">Propriedade ativa: {farmName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-surface-container-lowest">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm">Itens Críticos Detectados</p>
              <p className="text-xs text-amber-700 mt-1">
                Abaixo estão listados os insumos com estoque abaixo do mínimo de segurança. Preencha as informações para gerar a ordem de compra organizada por fornecedor.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-outline-variant/30 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container">
                <tr className="border-b border-outline-variant/30 text-xs text-outline font-bold uppercase tracking-wider">
                  <th className="p-4 w-[35%]">Produto</th>
                  <th className="p-4 w-[15%]">Estoque Atual</th>
                  <th className="p-4 w-[20%]">Qtd a Comprar</th>
                  <th className="p-4 w-[30%]">Fornecedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {criticalItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-outline text-sm">Nenhum item crítico no momento.</td>
                  </tr>
                ) : (
                  criticalItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-[#0D2E1A]">{item.name}</p>
                        <p className="text-[10px] text-outline font-medium uppercase">{item.category}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#c62828] text-base">{item.quantity}</span>
                          <span className="text-[10px] text-outline uppercase">{item.unit}</span>
                        </div>
                        <p className="text-[10px] text-outline mt-0.5">Mín: {item.minQuantity}</p>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={inputs[item.id]?.buyQuantity || ""}
                            onChange={(e) => handleInputChange(item.id, "buyQuantity", e.target.value)}
                            className="w-full border border-outline-variant/50 focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] rounded-lg px-3 py-2 text-sm font-bold font-mono"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline uppercase">
                            {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="relative">
                          <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline/60" />
                          <input
                            type="text"
                            placeholder="Ex: Coopervale..."
                            value={inputs[item.id]?.supplier || ""}
                            onChange={(e) => handleInputChange(item.id, "supplier", e.target.value)}
                            className="w-full border border-outline-variant/50 focus:border-[#1A5E35] focus:ring-1 focus:ring-[#1A5E35] rounded-lg pl-9 pr-3 py-2 text-sm"
                            list="fornecedores-sugeridos"
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <datalist id="fornecedores-sugeridos">
            <option value="Coopervale Aves" />
            <option value="Agro Nutri LTDA" />
            <option value="VetFarma Center" />
            <option value="Comercial Avícola Zootécnia" />
          </datalist>

        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant/30 px-6 py-4 flex justify-end gap-3 bg-surface-container-lowest">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-[#0D2E1A] hover:bg-surface-container rounded-xl transition-colors border border-outline-variant/30"
          >
            Cancelar
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={criticalItems.length === 0}
            className="px-5 py-2.5 text-sm font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" /> Gere PDF do Pedido
          </button>
        </div>

      </div>
    </div>
  );
}
