const fs = require('fs');
const glob = require('glob');
const targetClass = 'h-[46px] w-fit px-4 text-xs font-bold bg-[#1A5E35] text-white hover:bg-[#0D2E1A] rounded-xl flex items-center gap-2 transition-all shadow-sm';

const files = glob.sync('src/app/relatorios/**/*.tsx');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
      
  const regex = /className="inline-flex items-center gap-2 px-3 py-1\.5 bg-\[#0D2E1A\] text-white text-xs font-bold rounded-lg hover:bg-\[#1A5E35\] transition-colors mb-4 w-max"/g;
  
  if(regex.test(content)) {
     content = content.replace(regex, 'className="' + targetClass + ' mb-4"');
     fs.writeFileSync(f, content, 'utf8');
     console.log('Updated', f);
  } else {
     console.log('Did not match pattern in', f);
  }
});
