import * as fs from 'fs';
import * as path from 'path';

const PARTIALS_DIR: string = path.join(__dirname, 'partials');
const OUTPUT_FILE: string = path.join(__dirname, 'schema.prisma');

function mergeSchemas(): void {
  console.log('🔄 Merging Prisma schema files...');

  // Read all partial files
  const files: string[] = fs
    .readdirSync(PARTIALS_DIR)
    .filter((file: string) => file.endsWith('.prisma'))
    .sort(); // Sort to ensure base.prisma is first

  let mergedContent: string = '';
  let hasGenerator: boolean = false;
  let hasDatasource: boolean = false;

  files.forEach((file: string) => {
    const filePath: string = path.join(PARTIALS_DIR, file);
    const content: string = fs.readFileSync(filePath, 'utf-8');

    // Only include generator and datasource once
    const lines: string[] = content.split('\n');
    const filteredLines: string[] = lines.filter((line: string) => {
      if (line.trim().startsWith('generator') && hasGenerator) return false;
      if (line.trim().startsWith('datasource') && hasDatasource) return false;
      if (line.trim().startsWith('generator')) hasGenerator = true;
      if (line.trim().startsWith('datasource')) hasDatasource = true;
      return true;
    });

    mergedContent += `// ==========================================\n`;
    mergedContent += `// ${file}\n`;
    mergedContent += `// ==========================================\n\n`;
    mergedContent += filteredLines.join('\n') + '\n\n';
  });

  // Write merged schema
  fs.writeFileSync(OUTPUT_FILE, mergedContent);
  console.log('✅ Schema files merged successfully!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

try {
  mergeSchemas();
} catch (error: unknown) {
  console.error('❌ Error merging schemas:', error);
  process.exit(1);
}
