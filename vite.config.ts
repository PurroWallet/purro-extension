import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        {
            name: 'copy-files',
            writeBundle() {
                copyFileSync('src/manifest.json', 'dist/manifest.json')
            }
        }
    ],
    build: {
        rollupOptions: {
            input: {
                // HTML files
                main: resolve(__dirname, 'html/main.html'),
                sidepanel: resolve(__dirname, 'html/sidepanel.html'),
                onboarding: resolve(__dirname, 'html/onboarding.html'),
                import: resolve(__dirname, 'html/import.html'),
                offscreen: resolve(__dirname, 'html/offscreen.html'),
                connect: resolve(__dirname, 'html/connect.html'),
                sign: resolve(__dirname, 'html/sign.html'),
                transaction: resolve(__dirname, 'html/transaction.html'),

                // Background scripts and dependencies
                background: resolve(__dirname, 'src/background/background.ts'),
                contentScript: resolve(__dirname, 'src/background/content-script.ts'),
                offscreenScript: resolve(__dirname, 'src/background/offscreen.ts'),
                injectedProviderBundle: resolve(__dirname, 'src/background/providers/injected-provider-bundle.ts'),
                'purro-icon': resolve(__dirname, 'src/background/utils/purro-icon.ts'),
            },
            // Configure external dependencies and specific resolutions
            external: [],
            // Handle CommonJS packages properly
            plugins: [],
            output: {
                entryFileNames: (chunkInfo) => {
                    // Ensure background and content scripts are properly named
                    if (chunkInfo.name === 'background') {
                        return 'background.js';
                    }
                    if (chunkInfo.name === 'contentScript') {
                        return 'contentScript.js';
                    }
                    if (chunkInfo.name === 'offscreen') {
                        return 'offscreen.js';
                    }
                    if (chunkInfo.name === 'injectedProviderBundle') {
                        return 'injectedProviderBundle.js';
                    }

                    return '[name].js';
                },
                chunkFileNames: (chunkInfo) => {
                    // Rename _commonjsHelpers to avoid Chrome extension error
                    if (chunkInfo.name === '_commonjsHelpers') {
                        return 'commonjs-helpers.js';
                    }
                    return '[name].js';
                },
                assetFileNames: '[name].[ext]',
                format: 'es'
            }
        },
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2022',
        minify: 'esbuild',
        sourcemap: false
    },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['buffer', 'process', 'ethers', '@solana/web3.js', '@mysten/sui', "bs58", "ws"],
        // Force pre-bundling of hyperliquid to avoid CommonJS issues
        force: true,
        esbuildOptions: {
            // Ensure CommonJS compatibility
            target: 'es2022',
            format: 'esm'
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            buffer: 'buffer',
            process: 'process',
        },
        // Ensure browser-friendly resolution
        conditions: ['browser', 'module', 'import', 'default']
    }
})