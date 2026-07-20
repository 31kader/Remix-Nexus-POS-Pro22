const { Project } = require('ts-morph');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const sourceFiles = project.getSourceFiles('src/**/*.{ts,tsx}');

let modifiedFiles = 0;

for (const sourceFile of sourceFiles) {
  let hasChanges = false;
  const imports = sourceFile.getImportDeclarations();
  
  let databaseImport = null;
  let needsLocalDb = false;
  
  for (const imp of imports) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.endsWith('database')) {
      databaseImport = imp;
      break;
    }
  }

  if (databaseImport) {
    const namedImports = databaseImport.getNamedImports();
    const firebaseMethods = ['set', 'get', 'update', 'remove', 'push', 'onValue', 'ref', 'child', 'rtdbQuery', 'orderByChild', 'equalTo', 'db', 'rtdb'];
    
    for (const namedImport of namedImports) {
      const name = namedImport.getName();
      if (firebaseMethods.includes(name)) {
        needsLocalDb = true;
        namedImport.remove();
        hasChanges = true;
      }
    }
    
    if (needsLocalDb) {
      const existingLocalDb = databaseImport.getNamedImports().find(n => n.getName() === 'localDb');
      if (!existingLocalDb) {
        databaseImport.addNamedImport('localDb');
      }
    }
  }

  if (hasChanges) {
    sourceFile.saveSync(); // Save the import changes first
  }

  // Now do robust regex-based replacements on the file text to avoid AST invalidation
  let text = fs.readFileSync(sourceFile.getFilePath(), 'utf8');
  const originalText = text;

  text = text.replace(/\bref\s*\(\s*db\s*,\s*(.*?)\)/g, '$1');
  text = text.replace(/\bref\s*\(\s*rtdb\s*,\s*(.*?)\)/g, '$1');
  text = text.replace(/\bref\s*\(\s*(.*?)\)/g, '$1');
  text = text.replace(/\bchild\s*\(\s*(.*?)\s*,\s*(.*?)\)/g, '`${$1}/${$2.replace(/^[\'"]|[\'"]$/g, \'\')}`');
  
  text = text.replace(/(?<!\.)\bset\s*\(/g, 'localDb.insert(');
  text = text.replace(/(?<!\.)\bupdate\s*\(/g, 'localDb.update(');
  text = text.replace(/(?<!\.)\bremove\s*\(/g, 'localDb.delete(');
  text = text.replace(/(?<!\.)\bget\s*\(/g, 'localDb.get(');
  text = text.replace(/(?<!\.)\bpush\s*\(/g, 'localDb.push(');
  text = text.replace(/(?<!\.)\bonValue\s*\(/g, 'localDb.subscribe(');

  if (text !== originalText || hasChanges) {
    fs.writeFileSync(sourceFile.getFilePath(), text, 'utf8');
    modifiedFiles++;
    console.log(`Refactored ${sourceFile.getFilePath()}`);
  }
}

console.log(`Done. Modified ${modifiedFiles} files.`);
