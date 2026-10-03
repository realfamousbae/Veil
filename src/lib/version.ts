import { version } from '../../package.json';

/** The app version from package.json (only this field ends up in the bundle). */
export const APP_VERSION: string = version;

/** Versions before 1.0.0 are betas. */
export const IS_BETA = APP_VERSION.startsWith('0.');
