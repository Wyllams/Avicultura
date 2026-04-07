import fs from 'fs';
import path from 'path';

function checkCaseSensitivity(dir, rootDir = dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
       if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          checkCaseSensitivity(fullPath, rootDir);
       }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Match imports: import ... from "path"
      const importRegex = /import\s+[^"']*?from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }

        // Resolve absolute path
        let targetPath = '';
        if (importPath.startsWith('@/')) {
           // map @/ to src/
           targetPath = path.join(rootDir, 'src', importPath.substring(2));
        } else {
           targetPath = path.resolve(dir, importPath);
        }

        // Because extensions might be omitted, try appending them
        const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
        let found = false;
        let strictFound = false;

        for (const ext of exts) {
           const tryPath = targetPath + ext;
           if (fs.existsSync(tryPath)) {
              found = true;
              
              // Now check exact case by comparing with fs.readdirSync of the parent dir
              const dirname = path.dirname(tryPath);
              const basename = path.basename(tryPath);
              
              try {
                const actualFiles = fs.readdirSync(dirname);
                if (actualFiles.includes(basename)) {
                   strictFound = true;
                   break;
                }
              } catch(e) {
                // If dirname doesn't exactly match case, readdirSync might still work on Windows but let's be careful
              }
           }
        }

        if (found && !strictFound) {
            console.error(`Case Sensitivity Mismatch in ${fullPath}:`);
            console.error(`  Imported: ${importPath}`);
        }
      }
    }
  }
}

const root = path.join(process.cwd());
checkCaseSensitivity(root);
console.log("Done checking case sensitivity.");
