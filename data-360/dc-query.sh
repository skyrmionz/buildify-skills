#!/usr/bin/env bash
# dc-query.sh - Executes ANSI SQL query against Data 360 via Connect API
# Usage: dc-query.sh "<ANSI_SQL_QUERY>"
# Examples:
#   dc-query.sh "SELECT * FROM ssot__Individual__dlm LIMIT 10"
#   dc-query.sh "SELECT SUM(UsageValue__c) FROM TenantBillingUsageEvent__dll WHERE ResourceType__c = 'DataCloud_DataQueries'"
#   dc-query.sh "SELECT * FROM TenantBillingUsageEvent__dll WHERE EventTime__c >= '2026-03-01' ORDER BY UsageValue__c DESC LIMIT 5"

set -e
if [ -z "$1" ]; then
    echo "Usage: $0 \"<ANSI_SQL_QUERY>\"" >&2
    echo "Example: $0 \"SELECT ssot__Id__c FROM ssot__Individual__dlm LIMIT 10\"" >&2
    exit 1
fi

# Base64 encode query to avoid shell/Apex quote escaping issues
QUERY_B64=$(echo -n "$1" | base64 | tr -d '\n')
TMP_APEX=$(mktemp -t dc-query.XXXXXX.apex)

# Uses Query SQL API (v3) - ConnectApi.CdpQuery.querySql - API 62+
cat > "$TMP_APEX" << APEX_SCRIPT
try {
    ConnectApi.QuerySqlInput query = new ConnectApi.QuerySqlInput();
    query.sql = EncodingUtil.base64Decode('${QUERY_B64}').toString();
    ConnectApi.QuerySqlOutput queryOutput = ConnectApi.CdpQuery.querySql(query, 'dc-query', 'default');
    ConnectApi.QuerySqlStatus status = queryOutput.status;
    while (status.completionStatus != ConnectApi.QuerySqlStatusEnum.FINISHED) {
        status = ConnectApi.CdpQuery.querySqlStatus(status.queryId, 'dc-query', 'default');
    }
    List<List<String>> rows = new List<List<String>>();
    Integer numProcessed = 0;
    Integer chunkSize = 10000;
    ConnectApi.QuerySqlPageOutput lastPage = null;
    while (numProcessed < status.rowCount) {
        ConnectApi.QuerySqlPageOutput pageOutput = ConnectApi.CdpQuery.querySqlRows(status.queryId, numProcessed, chunkSize, 'dc-query', 'default');
        lastPage = pageOutput;
        for (ConnectApi.QuerySqlRow rowObj : pageOutput.dataRows) {
            List<String> row = new List<String>();
            for (Object o : rowObj.row) {
                row.add(o != null ? String.valueOf(o) : null);
            }
            rows.add(row);
        }
        numProcessed += pageOutput.dataRows.size();
        if (pageOutput.dataRows.isEmpty()) break;
    }
    Map<String, Map<String, Object>> meta = new Map<String, Map<String, Object>>();
    if (!rows.isEmpty() && lastPage != null && lastPage.metadata != null) {
        for (Integer i = 0; i < lastPage.metadata.size(); i++) {
            ConnectApi.QuerySqlMetadataItem m = lastPage.metadata[i];
            Map<String, Object> item = new Map<String, Object>();
            item.put('placeInOrder', i);
            item.put('type', m.type != null ? String.valueOf(m.type) : 'VARCHAR');
            item.put('typeCode', 12);
            meta.put(m.name != null ? m.name : ('col' + i), item);
        }
    } else if (!rows.isEmpty()) {
        for (Integer i = 0; i < rows[0].size(); i++) {
            Map<String, Object> item = new Map<String, Object>();
            item.put('placeInOrder', i);
            item.put('type', 'VARCHAR');
            item.put('typeCode', 12);
            meta.put('col' + i, item);
        }
    }
    Map<String, Object> result = new Map<String, Object>();
    result.put('rowCount', status.rowCount);
    result.put('data', rows);
    result.put('metadata', meta);
    String json = JSON.serialize(result);
    System.debug('@@@' + json + '@@@');
} catch (Exception e) {
    Map<String, String> err = new Map<String, String>();
    err.put('error', e.getMessage());
    err.put('type', e.getTypeName());
    System.debug('@@@' + JSON.serialize(err) + '@@@');
}
APEX_SCRIPT

OUTPUT=$(sf apex run -f "$TMP_APEX" --json 2>/dev/null || true)
rm -f "$TMP_APEX" 2>/dev/null

EXTRACTED=$(echo "$OUTPUT" | jq -r '.result.logs // .result.debugLog // .debugLog // empty' 2>/dev/null)
[ -z "$EXTRACTED" ] && EXTRACTED="$OUTPUT"
# Use tail -1 to get the actual USER_DEBUG output (last @@@...@@@), not the Execute Anonymous source
JSON=$(echo "$EXTRACTED" | grep -o '@@@[^@]*@@@' | tail -1 | sed 's/^@@@//;s/@@@$//')
if [ -z "$JSON" ]; then
    echo "$OUTPUT" | jq . 2>/dev/null || echo "$OUTPUT"
    exit 1
fi
echo "$JSON" | jq . 2>/dev/null || echo "$JSON"
