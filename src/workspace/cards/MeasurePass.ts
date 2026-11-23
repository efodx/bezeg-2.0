import {createContext, useContext} from 'react';

/** True inside the hidden measure layer: card bodies render there only to be measured, so nothing in them may be live. */
export const MeasurePassContext = createContext(false);
export const useIsMeasurePass = (): boolean => useContext(MeasurePassContext);
