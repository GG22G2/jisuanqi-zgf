import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isAnalyze = mode === 'analyze'

    return {
        base: '/jisuanqi-zgf/',
        server: {
            host: '0.0.0.0',
        },
        plugins: [
            vue(),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            }),
            isAnalyze &&
                visualizer({
                    open: true, // 如果存在本地服务端口，将在打包后自动展示
                }),
        ].filter(Boolean),
        build: {},
    }
})
