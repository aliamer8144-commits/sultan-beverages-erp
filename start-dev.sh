#!/bin/bash
unset DATABASE_URL
exec bun --hot run dev "$@"
