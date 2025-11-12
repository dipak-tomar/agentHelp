import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  target: 'es2022',
  format: 'esm',
  logLevel: 'info',
};

// Build configurations for different entry points
const builds = [
  // Background service worker
  {
    ...buildOptions,
    entryPoints: ['src/background/background.ts'],
    outfile: 'dist/background.js',
    platform: 'browser',
  },
  // Content script
  {
    ...buildOptions,
    entryPoints: ['src/content/content.ts'],
    outfile: 'dist/content.js',
    platform: 'browser',
  },
  // Sidebar
  {
    ...buildOptions,
    entryPoints: ['src/sidebar/sidebar.tsx'],
    outfile: 'dist/sidebar.js',
    platform: 'browser',
    jsxImportSource: 'preact',
    jsx: 'automatic',
  },
  // Options page
  {
    ...buildOptions,
    entryPoints: ['src/options/options.tsx'],
    outfile: 'dist/options.js',
    platform: 'browser',
    jsxImportSource: 'preact',
    jsx: 'automatic',
  },
];

async function build() {
  try {
    // Create dist directory
    mkdirSync('dist', { recursive: true });

    if (isWatch) {
      // Watch mode
      const contexts = await Promise.all(
        builds.map(config => esbuild.context(config))
      );
      await Promise.all(contexts.map(ctx => ctx.watch()));
      console.log('👀 Watching for changes...');
    } else {
      // Build once
      await Promise.all(builds.map(config => esbuild.build(config)));
      console.log('✅ Build complete!');
    }

    // Copy static files
    copyFileSync('manifest.json', 'dist/manifest.json');
    copyFileSync('src/sidebar/sidebar.html', 'dist/sidebar.html');
    copyFileSync('src/sidebar/sidebar.css', 'dist/sidebar.css');
    copyFileSync('src/options/options.html', 'dist/options.html');
    copyFileSync('src/options/options.css', 'dist/options.css');

    // Copy PDF.js worker
    copyFileSync(
      'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      'dist/pdf.worker.min.mjs'
    );

    console.log('📦 Static files copied');

    // Generate icons
    console.log('🎨 Generating icons...');
    execSync('node create-icons.cjs', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
