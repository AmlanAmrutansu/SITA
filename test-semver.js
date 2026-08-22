const semver = require('semver');
try { new semver.SemVer(''); } catch (e) { console.log(e.message); }
try { new semver.SemVer(undefined); } catch (e) { console.log(e.message); }
