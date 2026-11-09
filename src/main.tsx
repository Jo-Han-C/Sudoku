import { render } from 'preact';
import { App } from './app';
import { initPwa } from './pwa/pwa';
import './styles/theme.css';
import './styles/global.css';
import './styles/app.css';

render(<App />, document.getElementById('app')!);
initPwa();
