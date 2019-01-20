// This file is the importer for our library on the web

// Import the webrtc adapter for compatibility.
import 'webrtc-adapter';

import * as dss from './index';

(window as any).dss = dss;