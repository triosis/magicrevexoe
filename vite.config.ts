import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { productionApi } from './scripts/frontend-config.mjs'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const deployment = command === 'build' ? productionApi({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }) : undefined
  return { plugins: [react(), ...(deployment ? [{ name: 'public-deployment-configuration', generateBundle() {
    this.emitFile({ type: 'asset' as const, fileName: 'deployment.json', source: JSON.stringify(deployment) })
  } }] : [])] }
})
