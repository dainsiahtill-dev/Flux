/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 默认正文字体：微软雅黑优先，其次系统无衬线
        sans: ['"Microsoft YaHei"', '"微软雅黑"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'], 
      },
      colors: {
        cyber: {
          black: '#050a0e',     // 最深背景
          dark: '#0b121b',      // 面板背景
          light: '#16202e',     // 较亮元素背景
          text: '#a0b0c0',      // 普通文本
          'text-bright': '#e0f0ff', // 高亮文本
        },
        neon: {
          blue: '#00f3ff',      // 主色调：电光蓝
          pink: '#ff00ff',      // 强调色：霓虹粉
          green: '#0aff00',     // 状态色：矩阵绿
        }
      },
      backgroundImage: {
        // 细微的电路板网格背景
        'circuit-pattern': "radial-gradient(circle at center, rgba(0, 243, 255, 0.03) 0, rgba(0, 0, 0, 0) 1px), linear-gradient(to right, rgba(0, 243, 255, 0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 243, 255, 0.02) 1px, transparent 1px)",
      },
      boxShadow: {
        // 核心特效：向内发光的霓虹边框
        'neon-blue-inset': 'inset 0 0 15px -3px rgba(0, 243, 255, 0.3), 0 0 5px -2px rgba(0, 243, 255, 0.5)',
        'neon-pink-inset': 'inset 0 0 15px -3px rgba(255, 0, 255, 0.3), 0 0 5px -2px rgba(255, 0, 255, 0.5)',
        // 向外发光
        'neon-blue-glow': '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // 新增：缓慢的光影扫描动画
        'light-flow': 'lightFlow 20s linear infinite',
      },
      keyframes: {
        // 定义背景水平移动的关键帧
        lightFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      }
    },
  },
  plugins: [
     // 添加一个插件来实现特定边框发光
    plugin(function({ addUtilities, theme }) {
      const neonUtilities = {
        '.border-neon-blue': {
           borderColor: theme('colors.neon.blue'),
           boxShadow: `0 0 5px ${theme('colors.neon.blue')}, inset 0 0 5px ${theme('colors.neon.blue')}`
        },
        '.text-neon-blue': {
           color: theme('colors.neon.blue'),
           textShadow: `0 0 5px ${theme('colors.neon.blue')}`
        }
      }
      addUtilities(neonUtilities)
    })
  ],
}
