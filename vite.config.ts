import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const configDir = import.meta.dirname

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === 'web'
      ? []
      : [
          electron({
            main: {
              // Shortcut of `build.lib.entry`.
              entry: 'electron/main.ts',
              vite: {
                build: {
                  rollupOptions: {
                    // Modulo nativo: nao pode ser bundlado, resolve de node_modules em runtime.
                    external: ['better-sqlite3'],
                  },
                },
              },
            },
            preload: {
              // Shortcut of `build.rollupOptions.input`.
              input: path.join(configDir, 'electron/preload.ts'),
            },
            renderer: {},
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src'),
    },
  },
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: path.resolve(configDir, 'index.html'),
      },
      // Exclude everything else from being treated as an entry point
      external: [
        '**/docs/**',
        '**/Paxtu_Distribuicao_*/**',
        '**/meusarquivospaxtu/**'
      ],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/minisearch')) {
            return 'vendor-search'
          }
          if (id.includes('/src/data/generated/progressao_2025')) {
            return 'data-progressao-2025'
          }
          if (id.includes('/src/data/generated/especialidades_guia')) {
            return 'data-especialidades-guia'
          }
          if (id.includes('/src/data/catalog/') && id.endsWith('.json')) {
            return 'data-catalog-legacy'
          }
          if (id.includes('/src/data/details/')) {
            return 'data-details'
          }
          return undefined
        }
      }
    }
  }
}))
