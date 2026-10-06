import type React from 'react';
import type { SetName } from '../lib/schema.js';
import { CadillacShowroom } from './CadillacShowroom.js';
import { CarBackSeat } from './CarBackSeat.js';
import { CellCalendar } from './CellCalendar.js';
import { CourtroomGallery } from './CourtroomGallery.js';
import { ReleaseCurb } from './ReleaseCurb.js';
import type { SetProps } from './shared.js';
import { TelephoneSplit } from './TelephoneSplit.js';

export const SET_COMPONENTS: Record<SetName, React.FC<SetProps>> = {
  'cadillac-showroom': CadillacShowroom,
  'car-back-seat': CarBackSeat,
  'courtroom-gallery': CourtroomGallery,
  'cell-calendar': CellCalendar,
  'telephone-split': TelephoneSplit,
  'release-curb': ReleaseCurb,
};
