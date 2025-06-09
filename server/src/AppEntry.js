// AppEntry.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/layout.css';
import './styles/base.css';
import introBg from './assets/intro-bg.jpeg';

// Dynamically set favicon
const link = document.createElement('link');
link.rel = 'shortcut icon';
link.href = introBg;
document.head.appendChild(link);

// Dynamically set Open Graph image for social media sharing
const metaImage = document.createElement('meta');
metaImage.property = 'og:image';
metaImage.content = introBg;
document.head.appendChild(metaImage);

// Additional Open Graph meta tags
const metaTags = [
  { property: 'og:title', content: 'AI applications re-imagined' },
  { property: 'og:type', content: 'Empowering AI applications.' },
  { property: 'og:url', content: 'https://Open_App_Partners' },
  { property: 'og:description', content: 'Redefining the impact of AI applications.' },
];

metaTags.forEach(({ property, content }) => {
  const meta = document.createElement('meta');
  meta.property = property;
  meta.content = content;
  document.head.appendChild(meta);
});

// Render the React application
const root = createRoot(document.getElementById('root'));
root.render(<App />);
