#!/usr/bin/env bash
# dc-list-objects.sh - Retrieves all Data 360 objects (DLOs, DMOs, CIOs)
# Uses pg_catalog query (primary) - Data Lake Objects (__dll) are not in Schema.getGlobalDescribe()
# Fallback: Schema.getGlobalDescribe() for orgs where DLOs are exposed as SObjects

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PG_SQL="SELECT relname FROM pg_catalog.pg_class WHERE relkind = 'v' AND (relname LIKE '%__dlm' OR relname LIKE '%__dll' OR relname LIKE '%__cio') ORDER BY relname"

# Primary: pg_catalog - works for Data Lake Objects which aren't in org schema
FALLBACK=$("$SCRIPT_DIR/dc-query.sh" "$PG_SQL" 2>/dev/null) || true
if [ -n "$FALLBACK" ] && echo "$FALLBACK" | jq -e '.data' >/dev/null 2>&1; then
    echo "$FALLBACK" | jq '[.data[] | {name: .[0], label: .[0]}]'
    exit 0
fi

# Fallback: Schema.getGlobalDescribe() - for orgs where Data 360 objects are SObjects
TMP_APEX=$(mktemp -t dc-list-objects.XXXXXX.apex)
cat > "$TMP_APEX" << 'APEX_SCRIPT'
List<Map<String, String>> objects = new List<Map<String, String>>();
for (Schema.SObjectType objType : Schema.getGlobalDescribe().values()) {
    String name = objType.getDescribe().getName();
    if (name.endsWith('__dlm') || name.endsWith('__dll') || name.endsWith('__cio')) {
        Map<String, String> m = new Map<String, String>();
        m.put('name', name);
        m.put('label', objType.getDescribe().getLabel());
        objects.add(m);
    }
}
String output = System.JSON.serialize(objects);
System.debug('@@@' + output + '@@@');
APEX_SCRIPT

OUTPUT=$(sf apex run -f "$TMP_APEX" --json 2>/dev/null || true)
rm -f "$TMP_APEX"

EXTRACTED=$(echo "$OUTPUT" | jq -r '.result.logs // .result.debugLog // .debugLog // empty' 2>/dev/null)
[ -z "$EXTRACTED" ] && EXTRACTED="$OUTPUT"
JSON=$(echo "$EXTRACTED" | grep -o '@@@[^@]*@@@' | tail -1 | sed 's/^@@@//;s/@@@$//')
if [ -n "$JSON" ]; then
    echo "$JSON" | jq .
    exit 0
fi

echo '{"error": "Could not list Data 360 objects. Ensure Data Cloud is enabled and dc-query.sh can connect."}' | jq .
exit 1
