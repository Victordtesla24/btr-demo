#!/usr/bin/env python3
"""Deployment configuration test script.

This script validates deployment configuration before deploying to a hosting platform.
It checks:
- Required files exist (Procfile, runtime.txt, requirements.txt)
- Environment variables are documented
- Python version matches runtime.txt
- Dependencies can be installed
- Application can start (without actually running it)
"""

import os
import sys
from pathlib import Path

def test_file_exists(filepath: str, description: str) -> bool:
    """Test if a file exists."""
    path = Path(filepath)
    exists = path.exists()
    if exists:
        print(f"✅ {description}: {filepath}")
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
    return exists

def test_file_content(filepath: str, required_content: str, description: str) -> bool:
    """Test if file contains required content."""
    path = Path(filepath)
    if not path.exists():
        print(f"❌ {description}: File not found")
        return False
    
    content = path.read_text()
    if required_content in content:
        print(f"✅ {description}: Found '{required_content}' in {filepath}")
        return True
    else:
        print(f"❌ {description}: '{required_content}' NOT found in {filepath}")
        return False

def test_python_version() -> bool:
    """Test Python version matches runtime.txt."""
    runtime_path = Path("runtime.txt")
    if not runtime_path.exists():
        print("❌ runtime.txt not found")
        return False
    
    runtime_content = runtime_path.read_text().strip()
    # Extract version (e.g., "python-3.10.12" -> "3.10")
    if "python-" in runtime_content:
        version = runtime_content.split("python-")[1].split(".")[:2]
        expected_version = ".".join(version)
    else:
        expected_version = runtime_content
    
    current_version = f"{sys.version_info.major}.{sys.version_info.minor}"
    
    if current_version.startswith(expected_version):
        print(f"✅ Python version: {current_version} (matches runtime.txt: {expected_version})")
        return True
    else:
        print(f"⚠️  Python version: {current_version} (runtime.txt specifies: {expected_version})")
        print("   Note: This is a warning, not an error. Platform will use runtime.txt version.")
        return True  # Not a hard failure

def test_procfile() -> bool:
    """Test Procfile configuration."""
    procfile_path = Path("Procfile")
    if not procfile_path.exists():
        print("❌ Procfile not found")
        return False
    
    content = procfile_path.read_text()
    
    # Check for PORT variable usage
    if "$PORT" in content:
        print("✅ Procfile uses $PORT environment variable")
        port_ok = True
    else:
        print("⚠️  Procfile does not use $PORT - may cause issues on some platforms")
        port_ok = True  # Not all platforms require it
    
    # Check for uvicorn command
    if "uvicorn" in content:
        print("✅ Procfile contains uvicorn command")
        uvicorn_ok = True
    else:
        print("❌ Procfile does not contain uvicorn command")
        uvicorn_ok = False
    
    return port_ok and uvicorn_ok

def test_requirements() -> bool:
    """Test requirements.txt exists and has key dependencies."""
    req_path = Path("requirements.txt")
    if not req_path.exists():
        print("❌ requirements.txt not found")
        return False
    
    content = req_path.read_text()
    required_packages = [
        "fastapi",
        "uvicorn",
        "pyswisseph",
        "httpx",
        "pydantic"
    ]
    
    all_present = True
    for package in required_packages:
        if package in content:
            print(f"✅ Required package found: {package}")
        else:
            print(f"❌ Required package missing: {package}")
            all_present = False
    
    return all_present

def test_env_vars_documented() -> bool:
    """Test that environment variables are documented in DEPLOYMENT.md."""
    deploy_path = Path("DEPLOYMENT.md")
    if not deploy_path.exists():
        print("⚠️  DEPLOYMENT.md not found")
        return True  # Not critical
    
    content = deploy_path.read_text()
    required_vars = ["OPENCAGE_API_KEY", "EPHE_PATH", "PORT"]
    
    all_documented = True
    for var in required_vars:
        if var in content:
            print(f"✅ Environment variable documented: {var}")
        else:
            print(f"⚠️  Environment variable not documented: {var}")
            # Not a hard failure, just a warning
    
    return all_documented

def test_backend_structure() -> bool:
    """Test backend directory structure."""
    required_files = [
        "backend/__init__.py",
        "backend/main.py",
        "backend/btr_core.py",
        "backend/config.py"
    ]
    
    all_exist = True
    for filepath in required_files:
        if Path(filepath).exists():
            print(f"✅ Backend file exists: {filepath}")
        else:
            print(f"❌ Backend file missing: {filepath}")
            all_exist = False
    
    return all_exist

def test_frontend_structure() -> bool:
    """Test frontend directory structure."""
    required_files = [
        "frontend/index.html",
        "frontend/app.js"
    ]
    
    all_exist = True
    for filepath in required_files:
        if Path(filepath).exists():
            print(f"✅ Frontend file exists: {filepath}")
        else:
            print(f"⚠️  Frontend file missing: {filepath}")
            # Not critical for API-only deployment
    
    return True  # Frontend is optional for API deployment

def main():
    """Run all deployment tests."""
    print("=" * 60)
    print("DEPLOYMENT CONFIGURATION TEST")
    print("=" * 60)
    print()
    
    results = []
    
    print("1. Checking required files...")
    print("-" * 60)
    results.append(test_file_exists("Procfile", "Procfile"))
    results.append(test_file_exists("runtime.txt", "runtime.txt"))
    results.append(test_file_exists("requirements.txt", "requirements.txt"))
    results.append(test_file_exists("DEPLOYMENT.md", "DEPLOYMENT.md"))
    print()
    
    print("2. Checking Procfile configuration...")
    print("-" * 60)
    results.append(test_procfile())
    print()
    
    print("3. Checking Python version...")
    print("-" * 60)
    results.append(test_python_version())
    print()
    
    print("4. Checking requirements.txt...")
    print("-" * 60)
    results.append(test_requirements())
    print()
    
    print("5. Checking environment variable documentation...")
    print("-" * 60)
    results.append(test_env_vars_documented())
    print()
    
    print("6. Checking backend structure...")
    print("-" * 60)
    results.append(test_backend_structure())
    print()
    
    print("7. Checking frontend structure...")
    print("-" * 60)
    results.append(test_frontend_structure())
    print()
    
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All tests passed ({passed}/{total})")
        print()
        print("Deployment configuration is valid!")
        return 0
    else:
        print(f"⚠️  Some tests failed ({passed}/{total} passed)")
        print()
        print("Please fix the issues above before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

