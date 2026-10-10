import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Counter — split UPI collection',
    short_name: 'Counter',
    description:
      'Enter one amount, collect it as stubs that each stay inside the zero-MDR band.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e1526',
    theme_color: '#0e1526',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
