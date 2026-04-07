const fs = require('fs');
const path = require('path');

function replaceRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceRecursively(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content;
      let modified = false;
      
      // matches <span className="...">...<ArrowLeft .../> Voltar... </span>
      const regex = /<span\s+className=\"[^\"]*\"\s*>\s*<ArrowLeft\s+className=\"[^\"]*\"\s*\/>(\s*(?:Voltar|Voltar para)[^<]*)\s*<\/span>/gi;
      
      newContent = newContent.replace(regex, (match, text) => {
        modified = true;
        return '<span className="h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm">\n               <ArrowLeft className="w-4 h-4" />' + text + '\n            </span>';
      });

      if (modified) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceRecursively('src/app');
