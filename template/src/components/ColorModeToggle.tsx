import type { ReactNode } from 'react';

import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';

type Mode = 'system' | 'light' | 'dark';

const NEXT: Record<Mode, Mode> = { system: 'light', light: 'dark', dark: 'system' };

const ICONS: Record<Mode, ReactNode> = {
  system: <BrightnessAutoIcon />,
  light: <LightModeIcon />,
  dark: <DarkModeIcon />,
};

/** Cycles system -> light -> dark. MUI saves the choice to localStorage. */
export function ColorModeToggle() {
  const { mode, setMode } = useColorScheme();
  const current = mode ?? 'system';

  return (
    <Tooltip title={`Theme: ${current} (click to change)`}>
      <IconButton
        color="inherit"
        aria-label={`Theme: ${current}`}
        onClick={() => setMode(NEXT[current])}
      >
        {ICONS[current]}
      </IconButton>
    </Tooltip>
  );
}
