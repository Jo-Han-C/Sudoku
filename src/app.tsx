import { Toasts } from './components/Toasts';
import { GameScreen } from './screens/Game';
import { HomeScreen } from './screens/Home';
import { SettingsScreen } from './screens/Settings';
import { StatsScreen } from './screens/Stats';
import { screen } from './state/store';

function CurrentScreen() {
  switch (screen.value) {
    case 'game':
      return <GameScreen />;
    case 'stats':
      return <StatsScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}

export function App() {
  return (
    <>
      <CurrentScreen />
      <Toasts />
    </>
  );
}
