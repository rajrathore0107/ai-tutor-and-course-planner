#!/bin/bash
# Run this instead of plain pip install to avoid macOS temp dir issues

set -e

echo "🔧 Setting up EduAssist backend..."

# Create a local temp dir pip can always write to
mkdir -p /tmp/pip-eduassist

TMPDIR=/tmp/pip-eduassist pip install \
  --cache-dir /tmp/pip-eduassist/cache \
  -r requirements.txt

echo "✅ All packages installed successfully"
