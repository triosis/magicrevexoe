import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({plugins:[react()],test:{environment:'jsdom',include:['test/frontend/**/*.test.{ts,tsx}'],setupFiles:['test/frontend/setup.ts'],env:{VITE_API_URL:'http://127.0.0.1:4189/api/v1'},restoreMocks:true}})
