import React from 'react';
import { ReadingSpeed } from '@caravan/buddy-reading-types';
import FastReadingSpeedIcon from './reading-speed-icons/FastReadingSpeedIcon';
import ModerateReadingSpeedIcon from './reading-speed-icons/ModerateReadingSpeedIcon';
import SlowReadingSpeedIcon from './reading-speed-icons/SlowReadingSpeedIcon';
import FastReadingSpeedAvatar from './reading-speed-avatars/FastReadingSpeedAvatar';
import ModerateReadingSpeedAvatar from './reading-speed-avatars/ModerateReadingSpeedAvatar';
import SlowReadingSpeedAvatar from './reading-speed-avatars/SlowReadingSpeedAvatar';

export function readingSpeedIcons(
  speed: ReadingSpeed,
  type: 'avatar' | 'icon'
): JSX.Element {
  switch (speed) {
    case 'fast':
      switch (type) {
        case 'avatar':
          return <FastReadingSpeedAvatar />;
        case 'icon':
          return <FastReadingSpeedIcon />;
      }
    case 'moderate':
      switch (type) {
        case 'avatar':
          return <ModerateReadingSpeedAvatar />;
        case 'icon':
          return <ModerateReadingSpeedIcon />;
      }
    case 'slow':
      switch (type) {
        case 'avatar':
          return <SlowReadingSpeedAvatar />;
        case 'icon':
          return <SlowReadingSpeedIcon />;
      }
  }
  return <></>;
}

export function readingSpeedLabels(speed: ReadingSpeed): string {
  switch (speed) {
    case 'fast':
      return 'Fast';
    case 'moderate':
      return 'Moderate';
    case 'slow':
      return 'Slow';
  }
}