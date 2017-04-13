# Digital Bitbox Backup Center

Standalone version of the Digital Bitbox Backup Center available [online](https://digitalbitbox.com/backup).

This repository can be downloaded and used offline in order to recover your wallet without possessing a Digital Bitbox. Just open the `backup.html` file in a browser.

See [digitalbitbox.com](https://digitalbitbox.com) for more information about the Digital Bitbox hardware wallet.

## For developers and hackers

The primary code is in `js/backup_in.js`. From this, create `js/backup.js` using browserify:
```
browserify js/backup_in.js -o js/backup.js
```

The other JavaScript files should not require editing. They contain standardized bitcoin functions and other helper functions.

Copyright Shift Devices AG, Switzerland
