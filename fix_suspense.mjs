import fs from 'fs';
import path from 'path';

const files = [
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\estoque\\entrada\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\estoque\\itens\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\estoque\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\mortalidade\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\sanidade\\vacinacao\\historico\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\estoque\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\sanidade\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\desempenho\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\relatorios\\boletim\\page.tsx",
  "c:\\Users\\wylla\\.gemini\\Zootécnia_Aves\\src\\app\\dashboard\\page.tsx"
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Skip if already modified
  if (content.includes('export default function ') && content.includes('<Suspense') && !content.includes('export default function Page() {\\n  return (\\n    <Suspense')) {
     if(content.includes("Suspense fallback")) {
         console.log(`Skipping ${file} - seemingly already has Suspense wrapper`);
         continue;
     }
  }

  // Match export default function [Name]
  const regex = /export default function ([A-Za-z0-9_]+)\s*\(/;
  const match = content.match(regex);
  if (match) {
    const defaultName = match[1];
    const newName = defaultName + "Content";
    
    content = content.replace(regex, `function ${newName}(`);
    
    // Add Suspense import if missing
    if (!content.includes('Suspense')) {
      const reactImportRegex = /import React[^'"]*from ['"]react['"];?/;
      const reactMatch = content.match(reactImportRegex);
      if (reactMatch) {
         content = content.replace(reactImportRegex, `${reactMatch[0]}\nimport { Suspense } from "react";`);
      } else {
         const firstImport = content.indexOf('import');
         if (firstImport !== -1) {
            content = content.slice(0, firstImport) + 'import { Suspense } from "react";\n' + content.slice(firstImport);
         } else {
            content = 'import { Suspense } from "react";\n' + content;
         }
      }
    }
    
    const exportBlock = `
export default function ${defaultName}() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Carregando...</div>}>
      <${newName} />
    </Suspense>
  );
}
`;
    content += exportBlock;
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}
