// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import packages from '../version.json';

export const environment = {
  production: false,
  api: 'http://localhost:5000',
  apiVersion: 'v1',
  apmServer: 'https://apm.badman.app',
  adsense: {
    adClient: 'ca-pub-2426855871474715',
    show: true,
  },
  version: packages.version
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
