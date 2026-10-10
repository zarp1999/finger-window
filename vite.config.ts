import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/finger-window/' : '/',
  plugins: [react()],
  build: { target: 'es2022' },
}));
