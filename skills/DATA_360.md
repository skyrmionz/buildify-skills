# Salesforce Data 360 Skills

Query Salesforce Data 360 (Data Cloud) using ANSI SQL via the SF CLI. Installed by `./setup.sh` into your project's `.skills/` directory.

## Prerequisites

- Salesforce CLI (`sf`) authenticated to an org with Data 360 / Data Cloud enabled
- `jq` for JSON formatting (`brew install jq` or `apt install jq`)

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `dc-list-objects.sh` | List Data 360 objects (DLOs, DMOs, CIOs) | `./.skills/dc-list-objects.sh` |
| `dc-describe.sh` | Get column names for a table | `./.skills/dc-describe.sh <TableName>` |
| `dc-query.sh` | Execute ANSI SQL against Data 360 | `./.skills/dc-query.sh "<SQL_QUERY>"` |

## How It Works

The scripts use the SF CLI to execute anonymous Apex that calls `ConnectApi.CdpQuery.querySql` (API v62+). Queries are base64-encoded to avoid shell/Apex escaping issues.

## Query Rules

- Data 360 uses **ANSI SQL**, not SOQL
- Always wrap the query string in double quotes
- Standard fields/objects use the `ssot__` namespace prefix
- Always `dc-describe.sh` a table before querying to confirm field names

## Examples

```bash
# List all Data 360 objects
./.skills/dc-list-objects.sh

# Describe a table's columns
./.skills/dc-describe.sh Individual__dlm

# Query data
./.skills/dc-query.sh "SELECT ssot__Id__c, ssot__FirstName__c FROM ssot__Individual__dlm LIMIT 10"

# Aggregation
./.skills/dc-query.sh "SELECT SUM(UsageValue__c) FROM TenantBillingUsageEvent__dll WHERE ResourceType__c = 'DataCloud_DataQueries'"
```

## When to Use

| Need | Tool |
|------|------|
| Query Data Cloud tables with SQL | Data 360 `dc-query.sh` |
| Explore Data Cloud schema | Data 360 `dc-describe.sh` + `dc-list-objects.sh` |
| Run SOQL against standard org | Buildify MCP `sf_query` tool |
| Understand Data Cloud concepts | sf-skills `sf-datacloud-*` knowledge |
