import { GameScreen } from './screens/Game';
import { HomeScreen } from './screens/Home';
import { screen } from './state/store';

export function App() {
  return screen.value === 'game' ? <GameScreen /> : <HomeScreen />;
}
