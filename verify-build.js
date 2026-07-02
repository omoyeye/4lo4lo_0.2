
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying build for deployment...');

const distPath = path.resolve(process.cwd(), 'dist');
const publicPath = path.resolve(distPath, 'public');
const indexPath = path.resolve(publicPath, 'index.html');

console.log('Checking paths:');
console.log('- dist:', fs.existsSync(distPath) ? '✅' : '❌', distPath);
console.log('- public:', fs.existsSync(publicPath) ? '✅' : '❌', publicPath);
console.log('- index.html:', fs.existsSync(indexPath) ? '✅' : '❌', indexPath);

if (fs.existsSync(publicPath)) {
  const files = fs.readdirSync(publicPath);
  console.log('📄 Files in public directory:', files);
}

if (!fs.existsSync(indexPath)) {
  console.error('❌ Build verification failed: index.html not found');
  process.exit(1);
} else {
  console.log('✅ Build verification successful');
}
