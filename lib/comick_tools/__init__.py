# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2026 Russhvith

"""Code shared by the tools under tools/.

Scripts add the repo's lib/ folder to sys.path themselves, since they're
run directly with `python path/to/script.py` rather than installed.
"""
