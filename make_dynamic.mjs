import fs from 'fs';
import path from 'path';

function addForceDynamic(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
       if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          addForceDynamic(fullPath);
       }
    } else if (file === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // if it has 'export default async function' and no 'force-dynamic'
      if (content.includes('export default async function') && !content.includes('force-dynamic') && !content.includes('"use client"')) {
         content = `export const dynamic = "force-dynamic";\n\n` + content;
         fs.writeFileSync(fullPath, content, 'utf8');
         console.log('Added force-dynamic to ' + fullPath);
      }
    }
  }
}

const root = path.join(process.cwd(), 'src', 'app');
addForceDynamic(root);
console.log("Done.");
