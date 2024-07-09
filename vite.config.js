import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteExternalsPlugin } from "vite-plugin-externals"
import DC from '@dvgis/vite-plugin-dc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    DC(),
    viteExternalsPlugin({
      //不打包DC,直接外部脚本引入,
      // 注意项目里的public/lib/** 是我编译的，里面修复了一些bug,等dc新版本发布了就可以使用其最新版本
      // https://github.com/dvgis/dc-sdk/pull/191
      '@dvgis/dc-sdk':'DC'
    })
  ],
})
