import { useContext } from 'react';
import AlertContext from './AlertContext';

// Mismo motivo que useAuth: separado del provider para no romper Fast Refresh.
export const useAlert = () => useContext(AlertContext);

export default useAlert;
