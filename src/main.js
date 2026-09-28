import { App } from './App.js';

const initApp = () => {
    const app = new App();
    app.init();
    window.javaApp = app;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
