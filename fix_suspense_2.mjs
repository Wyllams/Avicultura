import fs from 'fs';
import path from 'path';

const files = [
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\estoque\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\mortalidade\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\sanidade\\vacinacao\\historico\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\sanidade\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\desempenho\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\boletim\\page.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if(content.includes('<Suspense')) {
     continue;
  }

  // Find export default function XYZ()
  const regex = /export default function ([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/;
  const match = content.match(regex);
  
  if (match) {
    const originalName = match[1];
    const newName = originalName + "Content";
    
    // Replace export default function XYZ with function XYZContent
    content = content.replace(regex, `function ${newName}() {`);
    
    // Make sure Suspense is imported
    if (!content.includes('Suspense')) {
      content = 'import { Suspense } from "react";\n' + content;
    }
    
    const exportBlock = `
export default function ${originalName}() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-outline">Carregando...</div>}>
      <${newName} />
    </Suspense>
  );
}
`;
    content += exportBlock;
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  } else {
    console.log(`Export default not found in ${file}`);
  }
}
