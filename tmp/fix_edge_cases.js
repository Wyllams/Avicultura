const fs = require('fs');
const targetClass = 'h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm';

let p1 = 'src/app/onboarding/page.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace(/className=\"text-on-surface-variant font-medium flex items-center gap-2 hover:text-foreground\"/g, 'className=\"' + targetClass + '\"');
fs.writeFileSync(p1, c1, 'utf8');

let p2 = 'src/app/lotes/[id]/encerrar/EncerrarLoteClient.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/<button onClick=\{\(\) => router\.back\(\)\} className=\"px-6 py-3 font-bold text-foreground bg-white hover:bg-surface-container rounded-xl transition-colors\">\s*Voltar e completar dados\s*<\/button>/g, '<button onClick={() => router.back()} className=\"' + targetClass + '\">\\n                    <ArrowLeft className=\"w-4 h-4\" /> Voltar e completar dados\\n                 </button>');
fs.writeFileSync(p2, c2, 'utf8');

console.log('Fixed edge cases!');
