#!/usr/bin/env python3
"""
IDS Validator using IfcOpenShell's IfcTester
Validates IFC files against IDS specifications
"""

import sys
import json
import os
import traceback
from pathlib import Path

try:
    import ifcopenshell
    import ifctester
    import ifctester.ids
    import ifctester.reporter
except ImportError as e:
    print(json.dumps({
        "error": "Missing dependencies",
        "message": str(e),
        "solution": "Please install: pip install ifctester ifcopenshell"
    }), file=sys.stderr)
    sys.exit(1)


def validate_ids(ifc_path: str, ids_path: str, output_format: str = "json") -> dict:
    """
    Validate an IFC file against an IDS specification.

    Args:
        ifc_path: Path to the IFC file
        ids_path: Path to the IDS XML file
        output_format: Output format (json, html, console)

    Returns:
        Dictionary containing validation results
    """
    try:
        # Verify files exist
        if not os.path.exists(ifc_path):
            raise FileNotFoundError(f"IFC file not found: {ifc_path}")
        if not os.path.exists(ids_path):
            raise FileNotFoundError(f"IDS file not found: {ids_path}")

        # Load IDS specification
        specs = ifctester.ids.open(ids_path)

        # Load IFC model
        ifc_model = ifcopenshell.open(ifc_path)

        # Perform validation
        specs.validate(ifc_model)

        # Generate report based on format
        if output_format.lower() == "json":
            json_reporter = ifctester.reporter.Json(specs)
            json_reporter.report()
            result = json_reporter.to_string()
            return json.loads(result)
        elif output_format.lower() == "html":
            html_reporter = ifctester.reporter.Html(specs)
            html_reporter.report()
            return {"html": html_reporter.to_string()}
        else:
            console_reporter = ifctester.reporter.Console(specs)
            console_reporter.report()
            return {"console": console_reporter.to_string()}

    except Exception as e:
        return {
            "error": type(e).__name__,
            "message": str(e),
            "traceback": traceback.format_exc()
        }


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Invalid arguments",
            "usage": "python ids_validator.py <ifc_file> <ids_file> [output_format]"
        }))
        sys.exit(1)

    ifc_path = sys.argv[1]
    ids_path = sys.argv[2]
    output_format = sys.argv[3] if len(sys.argv) > 3 else "json"

    # Perform validation
    result = validate_ids(ifc_path, ids_path, output_format)

    # Output result as JSON
    print(json.dumps(result, indent=2))

    # Exit with appropriate code
    sys.exit(0 if "error" not in result else 1)


if __name__ == "__main__":
    main()