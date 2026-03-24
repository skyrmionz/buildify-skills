#!/usr/bin/env bash
# dc-describe.sh - Retrieves schema (column names) for a Data 360 table
# Uses PostgreSQL catalog queries (same approach as datacloud-mcp-query-1)
# Usage: dc-describe.sh <TableName>
# Example: dc-describe.sh Individual__dlm

set -e
if [ -z "$1" ]; then
    echo "Usage: $0 <TableName>" >&2
    echo "Example: $0 Individual__dlm" >&2
    exit 1
fi

TABLE="$1"
# Escape single quotes in table name for SQL
TABLE_ESC="${TABLE//\'/\\\'}"

# Same SQL as datacloud-mcp-query-1 describe_table - queries pg_catalog for column names
SQL="SELECT a.attname FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_class c ON (c.relnamespace = n.oid) JOIN pg_catalog.pg_attribute a ON (a.attrelid = c.oid) JOIN pg_catalog.pg_type t ON (a.atttypid = t.oid) LEFT JOIN pg_catalog.pg_attrdef def ON (a.attrelid = def.adrelid AND a.attnum = def.adnum) LEFT JOIN pg_catalog.pg_description dsc ON (c.oid = dsc.objoid AND a.attnum = dsc.objsubid) LEFT JOIN pg_catalog.pg_class dc ON (dc.oid = dsc.classoid AND dc.relname = 'pg_class') LEFT JOIN pg_catalog.pg_namespace dn ON (dc.relnamespace = dn.oid AND dn.nspname = 'pg_catalog') WHERE a.attnum > 0 AND NOT a.attisdropped AND c.relname='${TABLE_ESC}'"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/dc-query.sh" "$SQL"
