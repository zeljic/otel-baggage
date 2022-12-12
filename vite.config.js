import {defineConfig} from 'vite';

export default defineConfig({
	server: {
		port: 1336,
		proxy: {
			'/api': 'http://localhost:1337'
		}
	}
});