const fs = require('fs');
const glob = require('glob');
const targetClass = 'h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm';

const files = glob.sync('src/app/**/*.tsx');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
      
  // Look for any Link or button or span that has "Voltar" and an Icon.
  // We'll just replace the className string directly if it's one of the "Voltar" wrappers we know.
  // The known old classes in relatorios:
  let knownClass1 = /className=\"inline-flex items-center gap-2 px-3 py-1\.5 bg-\[#0D2E1A\] text-white text-xs font-bold rounded-lg hover:bg-\[#1A5E35\] transition-colors[^"]*\"/g;
  let knownClass2 = /className=\"inline-flex items-center gap-2 text-sm font-bold text-outline hover:text-\[#0D2E1A\] transition-colors[^"]*\"/g;
  // Let's just find <Link href="something" className="..."> <ArrowLeft|ChevronLeft /> Voltar </Link>
  
  let modified = false;
  
  // Replace Link version
  const linkRegex = /(<Link[^>]*?className=\")([^\"]*)(\"[^>]*>\s*<(?:ChevronLeft|ArrowLeft)[^>]*>\s*Voltar(?:.*?)<\/Link>)/gis;
  content = content.replace(linkRegex, (match, prefix, oldClass, suffix) => {
    // If it's already targetClass, ignore
    if (oldClass.includes('h-[46px] w-fit px-4 text-xs')) return match;
    modified = true;
    return prefix + targetClass + ' mb-4 group' + suffix;
  });

  // Replace button version
  const btnRegex = /(<button[^>]*?className=\")([^\"]*)(\"[^>]*>\s*<(?:ChevronLeft|ArrowLeft)[^>]*>\s*Voltar(?:.*?)<\/button>)/gis;
  content = content.replace(btnRegex, (match, prefix, oldClass, suffix) => {
    if (oldClass.includes('h-[46px] w-fit px-4 text-xs')) return match;
    modified = true;
    return prefix + targetClass + ' mb-4 group' + suffix;
  });
  
  // Replace span inside Link version (the one I used)
  const spanRegex = /(<span[^>]*?className=\")([^\"]*)(\"[^>]*>\s*<(?:ChevronLeft|ArrowLeft)[^>]*>\s*Voltar(?:.*?)<\/span>)/gis;
  content = content.replace(spanRegex, (match, prefix, oldClass, suffix) => {
    if (oldClass.includes('h-[46px] w-fit px-4 text-xs')) return match;
    modified = true;
    return prefix + targetClass + suffix;
  });
  
  if(modified) {
     fs.writeFileSync(f, content, 'utf8');
     console.log('Updated', f);
  }
});
