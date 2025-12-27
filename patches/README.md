# Patches Directory

This directory contains patches applied to third-party Python packages during Docker build.

## ifctester-reporter-cardinality-fix.patch

**Source:** [IfcOpenShell PR #7516](https://github.com/IfcOpenShell/IfcOpenShell/pull/7516)

**Issue:** Fixes `UnboundLocalError` in `reporter.py` when processing IDS files with certain cardinality combinations.

**Root Cause:** The `report_specification()` method only handled three specific minOccurs/maxOccurs combinations:
- minOccurs=1, maxOccurs="unbounded" → "required"
- minOccurs=0, maxOccurs="unbounded" → "optional"
- minOccurs=0, maxOccurs=0 → "prohibited"

Valid IDS schema combinations like `minOccurs=0, maxOccurs=1` or `minOccurs=1, maxOccurs=1` left the `cardinality` variable unassigned, causing an error.

**Fix:** Adds fallback logic:
- If `minOccurs >= 1`: assigns "required"
- Otherwise (`minOccurs == 0`): assigns "optional"

**Applied to:** ifctester 0.8.4 (via requirements.txt)

**Status:** This patch will be removed once ifctester releases an official version containing this fix.
