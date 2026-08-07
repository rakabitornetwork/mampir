import { createInertiaApp } from '@inertiajs/react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

const pages = import.meta.glob('./Pages/**/*.jsx');

createInertiaApp({
    title: (title) => (title ? `${title} · Mampir` : 'Mampir Tunnel'),
    resolve: async (name) => {
        const importer = pages[`./Pages/${name}.jsx`];
        if (!importer) {
            throw new Error(`Page not found: ${name}`);
        }
        const module = await importer();
        return module.default ?? module;
    },
    setup({ el, App, props }) {
        createRoot(el).render(createElement(App, props));
    },
    progress: {
        color: '#0f766e',
    },
});
