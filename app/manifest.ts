import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NewVoice - 3分で世界の動きをつかむ',
    short_name: 'NewVoice',
    description: '忙しい毎日でも、通勤中でも、ながら聞きでOK。厳選された最新ニュースを上質な音声でお届け。',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#c779a3',
    icons: [
      {
        src: '/favicon_16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon_32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon_48.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon_192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    categories: ['news', 'audio', 'productivity'],
  }
}