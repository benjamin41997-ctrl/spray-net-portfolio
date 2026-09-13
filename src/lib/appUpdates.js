let updateAvailable = false;
let applyUpdate = () => {};
const listeners = new Set();

export const hasAppUpdate = () => updateAvailable;
export const subscribeToAppUpdate = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const refreshPortfolio = () => applyUpdate();

export function offerAppUpdate(update) {
  applyUpdate = update;
  updateAvailable = true;
  listeners.forEach((listener) => listener());
}
