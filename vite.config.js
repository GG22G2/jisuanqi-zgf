import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isAnalyze = mode === 'analyze'

    return {
        base: '/jisuanqi-zgf/',
        server: {
            host: process.env.VITE_DEV_HOST || '127.0.0.1',
            port: Number(process.env.VITE_DEV_PORT) || 4173,
        },
        plugins: [
            vue(),
            isAnalyze &&
                visualizer({
                    open: true, // 如果存在本地服务端口，将在打包后自动展示
                }),
        ].filter(Boolean),
        esbuild: {
            drop: ['console', 'debugger'],
        },
        build: {
            modulePreload: {
                polyfill: false,
            },
        },
    }
})
