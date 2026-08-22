const semver = require('semver');
try { new semver.SemVer(''); } catch (e) { console.log(1, e.message); }
try { new semver.SemVer(undefined); } catch (e) { console.log(2, e.message); }
try { new semver.SemVer('*'); } catch (e) { console.log(3, e.message); }
try { new semver.SemVer('file:../lib'); } catch (e) { console.log(4, e.message); }
