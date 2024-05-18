import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'index.html',
            precompress: false
        }),
        // Removed the prerender.default option as it was causing an error during build
    },
    onwarn: (warning, handler) => {
        const { code } = warning;
        if (code === 'css-unused-selector') return;

        handler(warning);
    },
    // Add Vite's proxy configuration
    vite: {
        server: {
            proxy: {
                // Proxy all API requests to the backend server
                '/api': {
                    target: 'http://localhost:5002', // Backend server running on port 5002
                    changeOrigin: true,
                    secure: false, // Set to false since we are not using HTTPS for local development
                    ws: true
                }
            }
        }
    }
};

export default config;
