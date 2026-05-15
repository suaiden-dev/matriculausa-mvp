import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(__dirname, '../../src');
const ALLOWED_FILES = ['App.tsx']; // App.tsx tem os redirects intencionalmente

function getAllFiles(dir: string, ext = '.tsx'): string[] {
  let results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const res = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(res, ext));
    } else if (entry.isFile() && (entry.name.endsWith(ext) || entry.name.endsWith('.ts'))) {
      results.push(res);
    }
  }
  return results;
}

describe('Legacy Reference Cleanup', () => {
  const files = getAllFiles(SRC_DIR).filter(f => !ALLOWED_FILES.some(a => f.endsWith(a)));

  it('Deve ter arquivos para testar', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const relativePath = file.replace(SRC_DIR, '');
    it(`${relativePath} não deve conter /affiliate-admin/`, () => {
      const content = readFileSync(file, 'utf-8');
      // Procura por "/affiliate-admin/" em strings
      const matches = content.match(/['"]\/affiliate-admin\/['"]/g) || 
                      content.match(/['"]\/affiliate-admin['"]/g);
      
      if (matches) {
        console.error(`❌ Found legacy reference in ${relativePath}:`, matches);
      }
      
      expect(matches, `Arquivo ${relativePath} contém referências legadas`).toBeNull();
    });
  }
});
