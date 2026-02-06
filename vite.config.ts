
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Carrega variáveis de arquivos .env
    const envFile = loadEnv(mode, '.', '');
    
    // Mescla variáveis do sistema (Cloudflare) com as do arquivo .env
    const env = { ...process.env, ...envFile };
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Substituição estática segura para o build de produção
        // REMOVIDO: 'process.env.API_KEY' para segurança. A chave agora vive apenas no Supabase Edge Functions.
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
        'process.env.NODE_ENV': JSON.stringify(mode),
      },
      resolve: {
        alias: {
          '@': path.resolve('./'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'lucide-react'],
                    charts: ['recharts'],
                    utils: ['xlsx']
                }
            }
        }
      }
    };
});
